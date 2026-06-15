import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn) {
    router.navigate(['/login']);
    return false;
  }

  const requiredScreen = route.data?.['screen'] as string | undefined;
  if (requiredScreen && !auth.hasScreen(requiredScreen)) {
    router.navigate(['/unauthorized']);
    return false;
  }

  return true;
};
