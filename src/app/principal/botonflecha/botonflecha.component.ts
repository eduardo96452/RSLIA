import { Component, HostListener } from '@angular/core';

@Component({
  selector: 'app-botonflecha',
  standalone: true,
  imports: [],
  templateUrl: './botonflecha.component.html',
  styleUrl: './botonflecha.component.css'
})
export class BotonflechaComponent {
  showButton = false;
  
  // Escuchamos el evento de scroll
    @HostListener('window:scroll', ['$event'])
    onWindowScroll() {
      const yOffset = window.pageYOffset;
  
      // Por ejemplo, mostramos el botón al bajar 200px
      if (yOffset > 200) {
        this.showButton = true;
      } else {
        this.showButton = false;
      }
    }
  
    // Método para volver al inicio
    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
