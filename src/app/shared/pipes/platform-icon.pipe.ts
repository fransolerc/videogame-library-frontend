import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'platformIcon',
  standalone: true
})
export class PlatformIconPipe implements PipeTransform {

  transform(platformType: string): string {
    const normalizedType = platformType ? platformType.toUpperCase() : 'UNKNOWN';

    switch (normalizedType) {
      case 'COMPUTER':
      case 'OPERATING_SYSTEM':
      case 'PC':
        // Computer Icon
        return 'M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z';

      case 'PORTABLE_CONSOLE':
        // Portable/Handheld Icon
        return 'M22 6H2v12h20V6zm-2 10H4V8h16v8zM7 9h2v2H7zm0 4h2v2H7zm4-4h2v2h-2zm0 4h2v2h-2zm4-4h2v6h-2z';

      case 'ARCADE':
        // Arcade Icon (Joystick)
        return 'M21 9H3V7h18v2zm-9-6c-1.1 0-2 .9-2 2v2h4V5c0-1.1-.9-2-2-2zm9 8H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2zm-9 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z';

      case 'CONSOLE':
      case 'PLATFORM':
      default:
        // Console/Gamepad Icon
        return 'M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z';
    }
  }
}
