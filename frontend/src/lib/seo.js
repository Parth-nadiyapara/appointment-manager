function ensureMeta(selector, attributeName, attributeValue) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  return element;
}

export function applyRouteMetadata(route) {
  const isAdmin = route === '/admin';
  const title = isAdmin
    ? 'CareDesk Admin | Lead and Appointment Dashboard'
    : 'CareDesk | Appointment Booking for Clinics and Coaching Centers';
  const description = isAdmin
    ? 'Private dashboard for managing appointments, leads, and follow-ups.'
    : 'Professional appointment scheduling and lead capture for clinics, coaching centers, and consultation-led businesses.';

  document.title = title;
  ensureMeta('meta[name="description"]', 'name', 'description').setAttribute('content', description);
  ensureMeta('meta[name="robots"]', 'name', 'robots').setAttribute('content', isAdmin ? 'noindex, nofollow' : 'index, follow');
  ensureMeta('meta[property="og:title"]', 'property', 'og:title').setAttribute('content', title);
  ensureMeta('meta[property="og:description"]', 'property', 'og:description').setAttribute('content', description);
}
