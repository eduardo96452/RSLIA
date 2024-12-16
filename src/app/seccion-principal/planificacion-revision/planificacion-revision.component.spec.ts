import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanificacionRevisionComponent } from './planificacion-revision.component';

describe('PlanificacionRevisionComponent', () => {
  let component: PlanificacionRevisionComponent;
  let fixture: ComponentFixture<PlanificacionRevisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanificacionRevisionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanificacionRevisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
