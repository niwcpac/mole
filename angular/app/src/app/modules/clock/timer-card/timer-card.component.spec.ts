import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { TimerCardComponent } from './timer-card.component';

describe('TimerCardComponent', () => {
  let component: TimerCardComponent;
  let fixture: ComponentFixture<TimerCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      declarations: [ TimerCardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TimerCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format seconds', () => {
    let secondsToFormat = 630;
    let expected = "00:10:30";

    let actual = component.formatSeconds(secondsToFormat);
    expect(actual).toEqual(expected);
  });

});
