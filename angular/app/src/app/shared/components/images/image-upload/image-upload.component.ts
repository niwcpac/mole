import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { EventApiService } from '../../../services';
import { Event } from '../../../models';

@Component({
  selector: 'mole-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss']
})
export class ImageUploadComponent implements OnInit {

  @Input() event: Event;
  @Output() newImagesUploadEvent = new EventEmitter<FileList>();
  imagesToUpload: FileList = null;
  uploadingImage: boolean = false;


  constructor(private _eventApiService: EventApiService) { }

  ngOnInit(): void {
  }

  // called after user selects images and hits 'Done'
  handleImageInput(event) {
    this.imagesToUpload = event.target.files;

    // event exists in db
    if (this.event.url) {
      this._eventApiService.uploadEventImages(this.event, this.imagesToUpload);
    }
    
    // new event, not yet in db
    else {
      this.newImagesUploadEvent.emit(this.imagesToUpload);
    }
    
  }
}
