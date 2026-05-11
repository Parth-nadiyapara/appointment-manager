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
  const isPrivate = route.startsWith('/admin') || route.startsWith('/dashboard') || route.startsWith('/auth');
  const isAdmin = route.startsWith('/admin');
  const isDashboard = route.startsWith('/dashboard');
  const isAuth = route.startsWith('/auth');
  const title = isAdmin
    ? 'CareDesk Admin | Lead and Appointment Dashboard'
    : isDashboard
      ? 'CareDesk Dashboard | My Appointments and Alerts'
      : isAuth
        ? 'CareDesk Access | Sign In and Register'
        : 'CareDesk | Appointment Booking for Clinics and Coaching Centers';
  const description = isAdmin
    ? 'Private dashboard for managing appointments, leads, and follow-ups.'
    : isDashboard
      ? 'Secure patient dashboard for reviewing appointments, reminders, and booking history.'
      : isAuth
        ? 'Secure authentication portal for signing in, registering, and managing your CareDesk session.'
        : 'Professional appointment scheduling and lead capture for clinics, coaching centers, and consultation-led businesses.';

  document.title = title;
  ensureMeta('meta[name="description"]', 'name', 'description').setAttribute('content', description);
  ensureMeta('meta[name="robots"]', 'name', 'robots').setAttribute('content', isPrivate ? 'noindex, nofollow' : 'index, follow');
  ensureMeta('meta[property="og:title"]', 'property', 'og:title').setAttribute('content', title);
  ensureMeta('meta[property="og:description"]', 'property', 'og:description').setAttribute('content', description);
}
