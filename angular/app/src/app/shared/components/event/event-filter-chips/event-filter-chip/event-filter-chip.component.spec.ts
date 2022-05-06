import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { EventFilterChipComponent } from './event-filter-chip.component';
import {By} from "@angular/platform-browser";

/*
* Mock EventFilterChipComponent to create a pseudo spy for ngAfterViewInit since lifecycle hooks
* cant be spied on using jasmine.
* */
class MockEventFilterChipComponent extends EventFilterChipComponent{

  /*
    * Angular 9 has a bug with TestBed spying on lifecycle hook methods. To get around this we mock the component being tested and have
    * the mock component's lifecycle hook be called by Angular, and the child will call the parent component lifecycle hook. By doing this,
    * we are then able to spy on the parents lifecycle hook.
    * */
  private view_after_init_spy = spyOn(EventFilterChipComponent.prototype, 'ngAfterViewInit').and.returnValue(null);

  ngOnInit() {
    super.type = 'event_type';
    super.value = {name: 'baconbits', pointStyle: {icon: 'blank', marker_color: 'green'}};
    super.ngOnInit();
  }

  ngAfterViewInit(){
      super.ngAfterViewInit();
  }
}

describe('EventFilterChipComponent', () => {
  let component: EventFilterChipComponent;
  let fixture: ComponentFixture<EventFilterChipComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MockEventFilterChipComponent]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MockEventFilterChipComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('ngAfterViewInit() >> if current type is of event_type it will set the background color of the mat-chip element to the event types pointstyle marker_color', () => {
    jasmine.getEnv().allowRespy(true); //Do this since when component is re-created the original spy will still be there
    /*
    * create new component so that when we call detectChanges() the ngAfterViewInit lifecycle will execute but
    * this time call will be the actual ngAfterViewInit implementation since we alter the spy before lifecycle hooks are called
    * */
    fixture = TestBed.createComponent(MockEventFilterChipComponent);
    component = fixture.componentInstance;

    component['view_after_init_spy'].and.callThrough();
    fixture.detectChanges();

    expect(component.chipElement.nativeElement.style.backgroundColor).toEqual('green');

    jasmine.getEnv().allowRespy(false);
  });


  it('removeChip() >> emits current chips type and value to custom event clickedRemove', () => {
    let emit_spy = spyOn(component.clickedRemove, 'emit').and.callThrough();
    component.clickedRemove.subscribe(data => {
      expect(data.type).toEqual(component.type);
      expect(data.value).toEqual(component.value)
    });

    component.removeChip();
    expect(emit_spy).toHaveBeenCalledWith({type: component.type, value: component.value});
  });


  it('prefix span element NOT BE NULL when prefix is set and sets spans innerText to prefix', () => {
    component.prefix = "MetaData";
    fixture.detectChanges();
    let span_elm = fixture.debugElement.query(By.css('span#span-prefix'));
    expect(span_elm).not.toBeNull();
    expect(span_elm.properties.innerText.trim()).toEqual(component.prefix + ":");
  });


  it('prefix span element BE NULL when prefix is NOT set', () => {
    let span_elm = fixture.debugElement.query(By.css('span#span-prefix'));
    expect(span_elm).toBeNull();
  });


  it('icon span element NOT BE NULL when icon is set', () => {
    let span_elm = fixture.debugElement.query(By.css('span#span-icon'));
    expect(span_elm).not.toBeNull();
  });


  it('icon span element BE NULL when icon is NOT set', () => {
    component.icon = null;
    fixture.detectChanges();
    let span_elm = fixture.debugElement.query(By.css('span#span-icon'));
    expect(span_elm).toBeNull();
  });


  it('fa-icon element NOT BE NULL when icon is set', () => {
    let fa_icon_elm = fixture.debugElement.query(By.css('fa-icon'));
    expect(fa_icon_elm).not.toBeNull();
  });


  it('fa-icon element BE NULL when icon is NOT set', () => {
    component.icon = null;
    fixture.detectChanges();

    let fa_icon_elm = fixture.debugElement.query(By.css('fa-icon'));
    expect(fa_icon_elm).toBeNull();
  });


  it('expect title to be set in template to title attribute', () => {
    let mat_chip_elm = fixture.debugElement.query(By.css('mat-chip'));
    expect(mat_chip_elm.properties.innerText.trim()).toContain(component.title);
  })


  it('when removed event is triggered removeChip is called', () => {
    let remove_chip_spy = spyOn(component, 'removeChip').and.returnValue(null);
    let mat_chip_elm = fixture.debugElement.query(By.css('mat-chip'));
    mat_chip_elm.triggerEventHandler('removed', {});
    fixture.detectChanges();

    expect(remove_chip_spy).toHaveBeenCalled();
  });

});
