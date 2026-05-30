export function homeForRole(role: string): string {
  if (role === 'ADMIN') return '/admin/health';
  if (role === 'CREATOR') return '/creator/dashboard';
  if (role === 'EMPLOYER') return '/employer/talent';
  if (role === 'FRANCHISE_OWNER') return '/franchise/dashboard';
  return '/dashboard';
}
