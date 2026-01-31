import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string | null = null;
  @Output() switchToRegister = new EventEmitter<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage = null;
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        // El login fue exitoso, el modal se cerrará desde el componente principal
      },
      error: (err) => {
        this.errorMessage = 'Email o contraseña incorrectos. Por favor, inténtalo de nuevo.';
        console.error('Error de login:', err);
      }
    });
  }

  onSwitchToRegister() {
    this.switchToRegister.emit();
  }
}
