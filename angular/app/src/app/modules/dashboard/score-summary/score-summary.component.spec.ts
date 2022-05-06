import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import {DebugElement} from "@angular/core";
import {ScoreSummaryComponent} from "./score-summary.component";

class MockScoreSummary extends ScoreSummaryComponent{
  ngOnInit() {
    super.ngOnInit();
  }
}

describe('ScoreSummaryComponent', () => {
  let component: ScoreSummaryComponent;
  let component_dom: DebugElement;
  let fixture: ComponentFixture<ScoreSummaryComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [MockScoreSummary],
    }).compileComponents();

    fixture = TestBed.createComponent(MockScoreSummary);
    component = fixture.debugElement.componentInstance;
    component_dom = fixture.debugElement;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

});
