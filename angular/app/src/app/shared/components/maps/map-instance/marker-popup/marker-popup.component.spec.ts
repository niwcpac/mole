import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { MarkerPopupComponent } from './marker-popup.component';
import {By} from "@angular/platform-browser";

describe('MarkerPopupComponent', () => {
  let component: MarkerPopupComponent;
  let fixture: ComponentFixture<MarkerPopupComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MarkerPopupComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MarkerPopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });


  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it("buttonClick() >> emits a value on popClick", () => {
    let emit_spy = spyOn(component.popClick, 'emit').and.returnValue(null);
    component.buttonClick();
    expect(emit_spy).toHaveBeenCalledWith(1);
  });


  it("buttonClick triggers when button is clicked, and button's text is set from buttonText", () => {
    let butt_text = "Marco";
    component.buttonText = butt_text;
    fixture.detectChanges();

    let button = fixture.debugElement.query(By.css('button'));
    let button_click_spy = spyOn(component, 'buttonClick').and.returnValue(null);
    button.triggerEventHandler('click', {});

    expect(button_click_spy).toHaveBeenCalled();
    expect(button.properties.innerText.trim()).toEqual(butt_text);
  });

});
