import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'mole-event-type-card',
  templateUrl: './event-type-card.component.html',
  styleUrls: ['./event-type-card.component.scss']
})
export class EventTypeCardComponent implements OnInit {
  @Input() eventType;
  @Input() useTitle = false;
  @Input() count;
  @Input() useToggle = true;
  @Output() cardClicked = new EventEmitter<any>();

  public isActive = false;

  constructor() { }

  ngOnInit(): void {}

  onClick() {
    if(this.useToggle) {
      this.isActive = !this.isActive;
    }
    this.cardClicked.emit({eventType: this.eventType, active: this.isActive});
  }

}
