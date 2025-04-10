import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

interface MoodEntry {
  mood: string;
  timestamp: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  moods: MoodEntry[] = [];
  private baseUrl = 'https://enhanced-cable-456111-i8.lm.r.appspot.com';
  private refreshIntervalId: any;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit(): void {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      this.router.navigate(['/login']);
    } else {
      this.fetchMoods(authToken);
      this.refreshIntervalId = setInterval(() => {
        this.fetchMoods(authToken);
      }, 5000);
    }
  }

  ngOnDestroy(): void {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  fetchMoods(token: string): void {
    this.http.get<MoodEntry[]>(`${this.baseUrl}/moods`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (data: MoodEntry[]) => {
        this.moods = data.sort((a, b) => {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        });
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error fetching mood history:', error);
        if (error.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  openMood(moodEntry: MoodEntry): void {
    console.log('Selected mood entry:', moodEntry);
  }
}
