import { Component, OnInit, AfterViewChecked, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, HeaderComponent, SidebarComponent],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  messages: { sender: string, content: string, timestamp: string }[] = [];
  newMessage = '';
  private baseUrl = 'https://enhanced-cable-456111-i8.lm.r.appspot.com';

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.get<any[]>(`${this.baseUrl}/messages`, { headers }).subscribe({
      next: (data) => {
        const sorted = data
          .map(msg => ({
            sender: msg.sent_by_gemini ? 'Gemini' : 'User',
            content: msg.content,
            timestamp: msg.timestamp
          }))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        this.messages = sorted;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error loading messages:', err);
        this.router.navigate(['/login']);
      }
    });
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.error('Scroll error:', err);
    }
  }

  sendMessage(): void {
    const token = localStorage.getItem('authToken');
    if (!this.newMessage.trim() || !token) return;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });

    const prompt = this.newMessage.trim();
    this.messages.push({ sender: 'User', content: prompt, timestamp: new Date().toISOString() });
    this.newMessage = '';

    this.http.post<{ response: string }>(
      `${this.baseUrl}/geminicall`,
      { prompt },
      { headers }
    ).subscribe({
      next: (data) => {
        this.messages.push({
          sender: 'Gemini',
          content: data.response,
          timestamp: new Date().toISOString()
        });
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error sending message:', err);
      }
    });
  }
}
