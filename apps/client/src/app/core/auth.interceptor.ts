import { ImpersonationStorageService } from '@ghostfolio/client/services/impersonation-storage.service';
import { TokenStorageService } from '@ghostfolio/client/services/token-storage.service';
import {
  HEADER_KEY_IMPERSONATION,
  HEADER_KEY_SKIP_INTERCEPTOR,
  HEADER_KEY_TIMEZONE,
  HEADER_KEY_TOKEN
} from '@ghostfolio/common/config';

import { HTTP_INTERCEPTORS, HttpEvent } from '@angular/common/http';
import {
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';

@Service({ autoProvided: false })
export class AuthInterceptor implements HttpInterceptor {
  private readonly impersonationStorageService: ImpersonationStorageService;
  private readonly tokenStorageService: TokenStorageService;

  constructor(
    tokenStorageService?: TokenStorageService,
    impersonationStorageService?: ImpersonationStorageService
  ) {
    // Allow injection via constructor for testing, fall back to Angular's inject()
    this.tokenStorageService =
      tokenStorageService ?? inject(TokenStorageService);
    this.impersonationStorageService =
      impersonationStorageService ?? inject(ImpersonationStorageService);
  }

  public intercept<T>(
    req: HttpRequest<T>,
    next: HttpHandler
  ): Observable<HttpEvent<T>> {
    let request = req;

    if (request.headers.has(HEADER_KEY_SKIP_INTERCEPTOR)) {
      // Bypass the interceptor
      request = request.clone({
        headers: req.headers.delete(HEADER_KEY_SKIP_INTERCEPTOR)
      });

      return next.handle(request);
    }

    // Add timezone header
    request = request.clone({
      headers: request.headers.set(
        HEADER_KEY_TIMEZONE,
        Intl?.DateTimeFormat().resolvedOptions().timeZone
      )
    });

    const token = this.tokenStorageService.getToken();

    if (token !== null) {
      const setHeaders: Record<string, string> = {
        [HEADER_KEY_TOKEN]: `Bearer ${token}`
      };

      const impersonationId = this.impersonationStorageService.getId();

      if (impersonationId !== null) {
        setHeaders[HEADER_KEY_IMPERSONATION] = impersonationId;
      }

      // Add Authorization (and possible impersonation) header(s)
      request = request.clone({ setHeaders });
    }

    return next.handle(request);
  }
}

export const authInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
];
