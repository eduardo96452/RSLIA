import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from "./principal/footer/footer.component";
import { NavbarComponent } from "./principal/navbar/navbar.component";
import { BotonflechaComponent } from "./principal/botonflecha/botonflecha.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule, FooterComponent, NavbarComponent, BotonflechaComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'RSLIA';
}
