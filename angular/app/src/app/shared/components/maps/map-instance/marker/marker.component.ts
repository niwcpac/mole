import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'mole-marker',
  templateUrl: './marker.component.html',
  styleUrls: ['./marker.component.scss']
})
export class MarkerComponent implements OnInit {

  @Input() point_style;
  @Input() large_size: boolean = false;
  
  constructor() { }

  ngOnInit(): void {
  }

}
