import { Component, OnInit, Input } from '@angular/core';
import { Event } from '../../../models'
import { EventApiService } from 'src/app/shared/services';


@Component({
  selector: 'mole-image-gallery',
  templateUrl: './image-gallery.component.html',
  styleUrls: ['./image-gallery.component.scss']
})
export class ImageGalleryComponent implements OnInit {

  @Input() event: Event;
  @Input() newImages: FileList;
  eventObservable = this._eventApiService.getSingleEvent();


  constructor(private _eventApiService: EventApiService) { }

  ngOnInit(): void {
    this.eventObservable.subscribe(
      (event: Event) => {
        this.event = event;
      }
    )
  }

}
