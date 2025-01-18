import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrismaDiagramComponent } from './prisma-diagram.component';

describe('PrismaDiagramComponent', () => {
  let component: PrismaDiagramComponent;
  let fixture: ComponentFixture<PrismaDiagramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrismaDiagramComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrismaDiagramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
