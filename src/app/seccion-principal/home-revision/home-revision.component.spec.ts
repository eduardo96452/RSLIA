import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeRevisionComponent } from './home-revision.component';

describe('HomeRevisionComponent', () => {
  let component: HomeRevisionComponent;
  let fixture: ComponentFixture<HomeRevisionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeRevisionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(HomeRevisionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
