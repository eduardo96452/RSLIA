import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BotonflechaComponent } from './botonflecha.component';

describe('BotonflechaComponent', () => {
  let component: BotonflechaComponent;
  let fixture: ComponentFixture<BotonflechaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BotonflechaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BotonflechaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
