import {
  AfterContentInit,
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import {EventType} from "../../../../models";
import {EventFilterChipsComponent} from "../event-filter-chips.component";

@Component({
  selector: 'mole-event-filter-chip',
  templateUrl: './event-filter-chip.component.html',
  styleUrls: ['./event-filter-chip.component.scss']
})
export class EventFilterChipComponent implements OnInit, AfterViewInit {
  @Input() type: string;
  @Input() value: any;
  @Output() clickedRemove = new EventEmitter<{type:string, value: EventType}>();
  @ViewChild('chip') chipElement: ElementRef;

  public title = "";
  public prefix;
  public icon;

  constructor() { }


  ngOnInit(): void {
    switch (this.type) {
      case EventFilterChipsComponent.CHIP_TYPE.EVENT:
        this.title = this.value.name;
        this.icon = this.value.pointStyle.icon;
        break;
      case EventFilterChipsComponent.CHIP_TYPE.META:
        this.prefix = "Metadata";
        this.title = '"' + this.value + '"';
        break;
      case EventFilterChipsComponent.CHIP_TYPE.LEVEL:
        this.prefix = "Level";
        this.title = this.value.toString();
        break;
      case EventFilterChipsComponent.CHIP_TYPE.POSE:
        this.icon = 'fa-check';
        this.prefix = "Pose"
      default:
        this.title = this.value

    }
  }

  ngAfterViewInit() {
    switch(this.type) {
      case EventFilterChipsComponent.CHIP_TYPE.EVENT:
        this.chipElement.nativeElement.style.backgroundColor = this.value.pointStyle.marker_color;
        break;
    }
  }

  removeChip() {
    this.clickedRemove.emit({type: this.type, value: this.value});
  }
}
