import crypto from 'crypto';
import express from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { sendTicketConfirmationEmail } from '../services/mail.js';

const router = express.Router();

function generateTicketNumber() {
  const num = Math.floor(100000 + Math.random() * 900000);
  return `CT-${num}`;
}

// POST /api/support/tickets — create a new support ticket (Guest or Authenticated)
router.post('/tickets', optionalAuth, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      booking_reference,
      category = 'general',
      subject,
      description,
      priority = 'normal',
    } = req.body || {};

    const cleanName = String(name || req.user?.name || '').trim();
    const cleanEmail = String(email || req.user?.email || '').trim().toLowerCase();
    const cleanPhone = phone ? String(phone).trim() : (req.user?.phone || null);
    const cleanBookingRef = booking_reference ? String(booking_reference).trim().toUpperCase() : null;
    const cleanCategory = String(category).trim().toLowerCase();
    const cleanSubject = String(subject || '').trim();
    const cleanDescription = String(description || '').trim();
    const cleanPriority = ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal';

    if (!cleanName) {
      return res.status(400).json({ error: 'Please provide your full name.' });
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (!cleanSubject) {
      return res.status(400).json({ error: 'Please provide a subject for your ticket.' });
    }
    if (!cleanDescription || cleanDescription.length < 10) {
      return res.status(400).json({ error: 'Please describe your request in at least 10 characters.' });
    }

    // Generate unique ticket number with collision avoidance
    let ticketNumber = generateTicketNumber();
    for (let attempts = 0; attempts < 5; attempts++) {
      const existing = await get('SELECT id FROM support_tickets WHERE ticket_number = ?', [ticketNumber]);
      if (!existing) break;
      ticketNumber = generateTicketNumber();
    }

    const ticketId = crypto.randomUUID();
    const userId = req.user?.id || null;

    await run(
      `INSERT INTO support_tickets (
        id, ticket_number, user_id, name, email, phone, booking_reference,
        category, subject, description, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')`,
      [
        ticketId,
        ticketNumber,
        userId,
        cleanName,
        cleanEmail,
        cleanPhone,
        cleanBookingRef,
        cleanCategory,
        cleanSubject,
        cleanDescription,
        cleanPriority,
      ]
    );

    // Record initial message
    const msgId = crypto.randomUUID();
    await run(
      `INSERT INTO support_ticket_messages (
        id, ticket_id, sender_type, sender_name, message
      ) VALUES (?, ?, 'traveler', ?, ?)`,
      [msgId, ticketId, cleanName, cleanDescription]
    );

    const ticket = {
      id: ticketId,
      ticket_number: ticketNumber,
      user_id: userId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      booking_reference: cleanBookingRef,
      category: cleanCategory,
      subject: cleanSubject,
      description: cleanDescription,
      priority: cleanPriority,
      status: 'open',
      created_at: new Date().toISOString(),
    };

    // Dispatch email notification asynchronously
    sendTicketConfirmationEmail({ to: cleanEmail, ticket }).catch((err) => {
      console.warn('[support] Failed to send ticket confirmation email:', err.message);
    });

    return res.status(201).json({
      ok: true,
      ticket,
      message: `Support ticket ${ticketNumber} has been logged. Our concierge will review it shortly.`,
    });
  } catch (err) {
    console.error('[support] Error creating ticket:', err);
    return res.status(500).json({ error: 'Failed to create support ticket. Please try again.' });
  }
});

// GET /api/support/tickets/track/:ticketNumber — look up a ticket
router.get('/tickets/track/:ticketNumber', optionalAuth, async (req, res) => {
  try {
    const rawNumber = String(req.params.ticketNumber || '').trim().toUpperCase();
    const queryEmail = req.query.email ? String(req.query.email).trim().toLowerCase() : null;

    const ticket = await get(
      `SELECT id, ticket_number, user_id, name, email, phone, booking_reference,
              category, subject, description, priority, status, admin_notes, created_at, updated_at
       FROM support_tickets
       WHERE ticket_number = ?`,
      [rawNumber]
    );

    if (!ticket) {
      return res.status(404).json({ error: `Ticket ${rawNumber} not found. Please check your reference code.` });
    }

    // Determine verification level
    const isOwnerUser = Boolean(req.user && ticket.user_id && req.user.id === ticket.user_id);
    const isOwnerEmail = Boolean(
      (req.user?.email && req.user.email.toLowerCase() === ticket.email.toLowerCase()) ||
      (queryEmail && queryEmail === ticket.email.toLowerCase())
    );
    const isAdmin = Boolean(req.user && req.user.role === 'admin');

    const isVerified = isOwnerUser || isOwnerEmail || isAdmin;

    // Fetch conversation messages
    const messages = await all(
      `SELECT id, ticket_id, sender_type, sender_name, message, created_at
       FROM support_ticket_messages
       WHERE ticket_id = ?
       ORDER BY created_at ASC`,
      [ticket.id]
    );

    if (!isVerified) {
      // Return partial public tracker info if not verified by email or login
      return res.json({
        ok: true,
        isVerified: false,
        ticket: {
          ticket_number: ticket.ticket_number,
          category: ticket.category,
          subject: ticket.subject,
          status: ticket.status,
          priority: ticket.priority,
          booking_reference: ticket.booking_reference,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
        },
        messages: [],
        notice: 'Enter the email address used when filing this ticket to view full correspondence and reply.',
      });
    }

    return res.json({
      ok: true,
      isVerified: true,
      ticket,
      messages,
    });
  } catch (err) {
    console.error('[support] Error tracking ticket:', err);
    return res.status(500).json({ error: 'Failed to look up ticket status.' });
  }
});

// GET /api/support/tickets/my — get all tickets filed by the logged-in user
router.get('/tickets/my', requireAuth, async (req, res) => {
  try {
    const userTickets = await all(
      `SELECT id, ticket_number, user_id, name, email, phone, booking_reference,
              category, subject, description, priority, status, created_at, updated_at
       FROM support_tickets
       WHERE user_id = ? OR email = ?
       ORDER BY created_at DESC`,
      [req.user.id, req.user.email || '']
    );

    return res.json({ ok: true, tickets: userTickets });
  } catch (err) {
    console.error('[support] Error fetching my tickets:', err);
    return res.status(500).json({ error: 'Failed to retrieve your tickets.' });
  }
});

// POST /api/support/tickets/:ticketNumber/messages — reply or add note to ticket
router.post('/tickets/:ticketNumber/messages', optionalAuth, async (req, res) => {
  try {
    const rawNumber = String(req.params.ticketNumber || '').trim().toUpperCase();
    const { message, email, sender_name } = req.body || {};

    const cleanMessage = String(message || '').trim();
    if (!cleanMessage) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }

    const ticket = await get(
      `SELECT id, ticket_number, user_id, name, email, status FROM support_tickets WHERE ticket_number = ?`,
      [rawNumber]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const isOwnerUser = Boolean(req.user && ticket.user_id && req.user.id === ticket.user_id);
    const isOwnerEmail = Boolean(
      (req.user?.email && req.user.email.toLowerCase() === ticket.email.toLowerCase()) ||
      (email && String(email).trim().toLowerCase() === ticket.email.toLowerCase())
    );
    const isAdmin = Boolean(req.user && req.user.role === 'admin');

    if (!isOwnerUser && !isOwnerEmail && !isAdmin) {
      return res.status(403).json({ error: 'Please provide the ticket email address or sign in to reply.' });
    }

    const senderType = isAdmin ? 'concierge' : 'traveler';
    const senderName = req.user?.name || sender_name || (isAdmin ? 'Coastal Concierge' : ticket.name);

    const msgId = crypto.randomUUID();
    await run(
      `INSERT INTO support_ticket_messages (
        id, ticket_id, sender_type, sender_name, message
      ) VALUES (?, ?, ?, ?, ?)`,
      [msgId, ticket.id, senderType, senderName, cleanMessage]
    );

    // If ticket was closed or resolved, reopen when traveler adds a follow-up
    if (!isAdmin && (ticket.status === 'resolved' || ticket.status === 'closed')) {
      await run(`UPDATE support_tickets SET status = 'in_progress', updated_at = NOW() WHERE id = ?`, [ticket.id]);
    } else {
      await run(`UPDATE support_tickets SET updated_at = NOW() WHERE id = ?`, [ticket.id]);
    }

    const savedMsg = {
      id: msgId,
      ticket_id: ticket.id,
      sender_type: senderType,
      sender_name: senderName,
      message: cleanMessage,
      created_at: new Date().toISOString(),
    };

    return res.status(201).json({ ok: true, message: savedMsg });
  } catch (err) {
    console.error('[support] Error adding message:', err);
    return res.status(500).json({ error: 'Failed to post message.' });
  }
});

export default router;
