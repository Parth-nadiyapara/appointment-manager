const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

function hasAnalytics() {
  return typeof window !== 'undefined' && Boolean(measurementId);
}

export function initAnalytics() {
  if (!hasAnalytics() || window.gtag) {
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false
  });
}

export function trackPageView(path, title) {
  if (!hasAnalytics() || !window.gtag) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: title
  });
}

export function trackBookingCompleted(serviceName) {
  if (!hasAnalytics() || !window.gtag) {
    return;
  }

  window.gtag('event', 'generate_lead', {
    event_category: 'booking',
    event_label: serviceName
  });
}
