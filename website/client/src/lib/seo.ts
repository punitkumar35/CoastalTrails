import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  schema?: Record<string, any>;
  noindex?: boolean;
}

export function useSEO({ title, description, canonical, ogType = 'website', ogImage, schema, noindex }: SEOProps) {
  useEffect(() => {
    // 1. Update Document Title
    const originalTitle = document.title;
    document.title = title;

    // 2. Helper to set or create meta tags
    const setMetaTag = (attribute: string, attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attribute}="${attrValue}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // 3. Robots meta tag
    if (noindex) {
      setMetaTag('name', 'robots', 'noindex, nofollow');
    } else {
      setMetaTag('name', 'robots', 'index, follow, max-image-preview:large');
    }

    // 4. Update Meta Description
    if (description) {
      setMetaTag('name', 'description', description);
      setMetaTag('property', 'og:description', description);
      setMetaTag('name', 'twitter:description', description);
    }

    // 5. Update OpenGraph Title
    setMetaTag('property', 'og:title', title);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('property', 'og:type', ogType);

    // 6. Update Canonical Link
    const finalCanonical = canonical || `https://coastaltrails.in${window.location.pathname}`;
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', finalCanonical);
    setMetaTag('property', 'og:url', finalCanonical);

    // 7. Update OG Image if specified
    if (ogImage) {
      setMetaTag('property', 'og:image', ogImage);
      setMetaTag('name', 'twitter:image', ogImage);
    }

    // 8. Inject Route-Specific JSON-LD Schema
    const scriptId = 'route-specific-schema';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = scriptId;
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    return () => {
      document.title = originalTitle;
      const dynamicScript = document.getElementById(scriptId);
      if (dynamicScript) dynamicScript.remove();
      setMetaTag('name', 'robots', 'index, follow, max-image-preview:large');
    };
  }, [title, description, canonical, ogType, ogImage, schema, noindex]);
}
