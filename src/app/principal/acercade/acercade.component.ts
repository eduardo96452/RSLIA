import { Component } from '@angular/core';
import { NavbarComponent } from "../navbar/navbar.component";
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-acercade',
  standalone: true,
  imports: [NavbarComponent, FooterComponent],
  templateUrl: './acercade.component.html',
  styleUrl: './acercade.component.css'
})
export class AcercadeComponent {

}
