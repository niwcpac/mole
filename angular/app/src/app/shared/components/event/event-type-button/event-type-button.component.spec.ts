import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { EventTypeButtonComponent } from './event-type-button.component';
import {By} from "@angular/platform-browser";

class MockEventTypeButton extends EventTypeButtonComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('EventTypeButtonComponent', () => {
  let component: EventTypeButtonComponent;
  let fixture: ComponentFixture<EventTypeButtonComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MockEventTypeButton ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockEventTypeButton);
    component = fixture.componentInstance;

    component.eventType = {
      url: 'eventtype/url',
      name: 'event type 1',
      event_level_key: 1,
      event_level_name: 'event level 1',
      icon_string: 'icon string',
      description: 'eventtype 1 description',
      color: 'blue',
      marker_color: 'green'
    };

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('onEventTypeClick() >> !!!!!!!!!!!!!!!!! CURRENTLY JUST A CONSOLE LOGGER FUNCTION !!!!!!!!!!!!!!!!!!!!', () => {

  });


  it('getColor() >> returns an object with color that is of current eventType color', () => {
    let color = component.getColor();
    expect(color).toEqual({color: component.eventType.color});
  });


  it('getMarkerColor() >> returns on object with color that is of current eventType marker_color', () => {
    let color = component.getMarkerColor();
    expect(color).toEqual({color: component.eventType.marker_color});
  });


  it('onEventTypeClick is called when button is clicked', () => {
    let on_event_type_click_spy = spyOn(component, 'onEventTypeClick').and.returnValue(null);
    let button = fixture.debugElement.query(By.css('button'));
    button.triggerEventHandler('click', {});
    expect(on_event_type_click_spy).toHaveBeenCalled();
  });


  it("buttons inner text should be the event type's name", () => {
    let button = fixture.debugElement.query(By.css('button'));
    expect(button.nativeElement.innerText).toEqual(component.eventType.name);
  });


  it('square fa-icon of button should grab its styles from the event types marker color', () => {
    let marker_color_spy = spyOn(component, 'getMarkerColor').and.returnValue({color: component.eventType.marker_color});
    fixture.detectChanges();
    let square_icon = fixture.debugElement.query(By.css('fa-icon#icon1-square'));
    expect(square_icon.properties.styles).toEqual({color: component.eventType.marker_color});

  });


  it("event type icon fa-icon should grab its icon from event type's icon and its style from event types color", () => {
    let get_color_spy = spyOn(component, 'getColor').and.returnValue({color: component.eventType.color});
    fixture.detectChanges();
    let event_type_icon = fixture.debugElement.query(By.css('fa-icon#icon1-eventtype-icon'));
    expect(event_type_icon.properties.styles).toEqual({color: component.eventType.color});
    expect(event_type_icon.properties.icon).toEqual(component.eventType.icon_string);
  });

});
