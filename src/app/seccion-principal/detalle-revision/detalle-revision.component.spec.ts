import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetalleRevisionComponent } from './detalle-revision.component';

describe('DetalleRevisionComponent', () => {
  let component: DetalleRevisionComponent;
  let fixture: ComponentFixture<DetalleRevisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetalleRevisionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetalleRevisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
