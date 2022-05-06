import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'mole-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  pageTitle: string;
  constructor() {
    this.pageTitle = "Dashboard";
  }

  ngOnInit(): void {
  }

}
