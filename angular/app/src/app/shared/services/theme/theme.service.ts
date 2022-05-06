import { DOCUMENT } from '@angular/common';
import { Inject, Injectable, OnDestroy, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService implements OnDestroy {
  private renderer: Renderer2;
  private _lightTheme = new BehaviorSubject<boolean>(false); // default to dark theme
  private cookieName = "theme";

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private rendererFactory: RendererFactory2,
    private _cookieService: CookieService
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
    
    // check cookie for theme
    if (this._cookieService.check(this.cookieName)) {
      if (this._cookieService.get(this.cookieName) == "dark") {
        this.setLightTheme(false);
      }
      else if(this._cookieService.get(this.cookieName) == "light") {
        this.setLightTheme(true);
      }
    }
    else {
      this.setLightTheme(false); // default to dark theme
    }
  }

  isLightTheme() {
    return this._lightTheme.asObservable();
  }

  setLightTheme(isLightTheme: boolean): void {
    this._lightTheme.next(isLightTheme);
    
    if (!isLightTheme) {
      this.renderer.addClass(this.document.body, 'dark-theme');
      this._cookieService.set(this.cookieName, "dark"); // set cookie
    }
    else {
      this.renderer.removeClass(this.document.body, 'dark-theme');
      this._cookieService.set(this.cookieName, "light"); // set cookie
    }
  }

  ngOnDestroy() {
    this.renderer.removeClass(this.document.body, 'dark-theme');
  }
}
