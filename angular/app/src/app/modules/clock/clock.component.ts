import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ClockService } from './service/clock.service';

@Component({
  selector: 'mole-clock',
  templateUrl: './clock.component.html',
  styleUrls: ['./clock.component.scss']
})
export class ClockComponent implements OnInit {

  pageTitle: string = "Clock";
  clockStream: Observable<string>;

  constructor(
    private _clockService: ClockService
  ) {

    this.clockStream = this._clockService.getClockStream();
  }

  ngOnInit(): void {
  }

}
