import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { EventTypeCardComponent } from './event-type-card.component';
import {EventType} from "../../../../models";
import {By} from "@angular/platform-browser";

class MockEventTypeCard extends EventTypeCardComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('EventTypeCardComponent', () => {
  let component: EventTypeCardComponent;
  let fixture: ComponentFixture<EventTypeCardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MockEventTypeCard]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockEventTypeCard);
    component = fixture.componentInstance;

    component.eventType = <EventType>{
      name: 'eventtype 1',
      description: 'eventtype 1 description',
      pointStyle: {icon: 'some icon', marker_color: 'green'}
    };
    component.count = 1;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it("onClick() >> if useToggle is true toggle the clicked card's isActive state, then emit the updated event type card", () => {
    let card_clicked_emit_spy = spyOn(component.cardClicked, 'emit').and.returnValue(null);
    let emit_value1 = {eventType: component.eventType, active: true};
    let emit_value2 = {eventType: component.eventType, active: false};

    component.onClick();
    expect(component.isActive).toBeTrue();
    expect(card_clicked_emit_spy).toHaveBeenCalledWith(emit_value1);

    component.isActive = false;
    component.useToggle = false;
    component.onClick();
    expect(component.isActive).toBeFalse();
    expect(card_clicked_emit_spy).toHaveBeenCalledWith(emit_value2);
  });


  it("when card is clicked the onClick function should fire", () => {
    let on_click_spy = spyOn(component, 'onClick').and.returnValue(null);

    let card = fixture.debugElement.query(By.css('mat-card'));
    card.triggerEventHandler('click', {});
    fixture.detectChanges();

    expect(on_click_spy).toHaveBeenCalled();
  });


  it("the count span should NOT BE NULL if count exists and the spans innerText be the count", () => {
    let count_span = fixture.debugElement.query(By.css('span#span-mat-card-avatar'));
    expect(count_span).not.toBeNull();
    expect(count_span.properties.innerText.trim()).toEqual(component.count.toString());
  });


  it("the count span should BE NULL when count DOES NOT exist", () => {
    component.count = null;
    fixture.detectChanges();
    let count_span = fixture.debugElement.query(By.css('span#span-mat-card-avatar'));
    expect(count_span).toBeNull();
  });


  it("eventType name div should NOT BE NULL when useTitle is TRUE and the eventType title spans innerText is the eventTypes name", () => {
    component.useTitle = true;
    fixture.detectChanges();
    let title_span = fixture.debugElement.query(By.css('span#span-mat-card-title'));
    expect(title_span).not.toBeNull();
    expect(title_span.properties.innerText.trim()).toEqual(component.eventType.name);
  });


  it("eventType name div should BE NULL when useTitle is FALSE", () => {
    let title_span = fixture.debugElement.query(By.css('span#span-mat-card-title'));
    expect(title_span).toBeNull();
  });

});
