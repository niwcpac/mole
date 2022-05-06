import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {DebugElement} from "@angular/core";
import {DashboardComponent} from "./dashboard.component";

class MockDashboard extends  DashboardComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let component_dom: DebugElement;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MockDashboard],
    }).compileComponents();

    fixture = TestBed.createComponent(MockDashboard);
    component = fixture.debugElement.componentInstance;
    component_dom = fixture.debugElement;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });


  it('when created sets the pageTitle to Dashboard', () => {
    expect(component.pageTitle).toEqual("Dashboard");
  });
});
