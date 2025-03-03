import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExtraccionDatosComponent } from './extraccion-datos.component';

describe('ExtraccionDatosComponent', () => {
  let component: ExtraccionDatosComponent;
  let fixture: ComponentFixture<ExtraccionDatosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExtraccionDatosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExtraccionDatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
