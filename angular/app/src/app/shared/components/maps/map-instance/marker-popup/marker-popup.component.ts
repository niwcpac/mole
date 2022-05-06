import { Component, OnInit, Output, EventEmitter, Input } from '@angular/core';

@Component({
  selector: 'mole-marker-popup',
  templateUrl: './marker-popup.component.html',
  styleUrls: ['./marker-popup.component.scss']
})
export class MarkerPopupComponent implements OnInit {

  @Output() popClick = new EventEmitter<number>();
  @Input() buttonText: string;

  constructor() { }

  ngOnInit(): void {
  }

  buttonClick(){
    this.popClick.emit(1);
  }

}
