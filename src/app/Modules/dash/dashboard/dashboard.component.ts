import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { TimeService } from '../../../Core/master/time.service';
import { Time } from '../../../Core/Interfaces/Time.interface';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})

export class DashboardComponent {
  stream: MediaStream | null = null;
  mixedStream: MediaStream | null = null;
  recorder: MediaRecorder | null = null;
  startButton: boolean = false;
  stopButton: boolean = false;
  screenshotInterval: any = null;
  canvas: HTMLCanvasElement | null = null;
  recordingActive: boolean = false;

  async startRecording() {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      this.mixedStream = new MediaStream([...this.stream.getTracks()]);
      this.recorder = new MediaRecorder(this.mixedStream);
      const chunks: BlobPart[] = [];
      this.recorder!.ondataavailable = (e) => {
        chunks.push(e.data);
      };
      this.recorder!.onstop = () => {
        const blob = new Blob(chunks, { 'type': 'video/mp4' });
        const url = URL.createObjectURL(blob);
        console.log("URL is", url);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.href = url;
        a.download = 'recorded-video.mp4';
        a.click();
        window.URL.revokeObjectURL(url);
        clearInterval(this.screenshotInterval);
        this.recordingActive = false;
      };
      this.recorder!.start();

      this.canvas = document.createElement('canvas');
      document.body.appendChild(this.canvas);

      this.screenshotInterval = setInterval(this.takeScreenshot.bind(this), 100000);

      this.startButton = true;
      this.stopButton = false;
      this.recordingActive = true;
    } catch (err) {
      console.error(err)
    }
  }

  takeScreenshot() {
    if (this.recordingActive && this.stream && this.canvas) {
      const videoTrack = this.stream.getVideoTracks()[0];
      if (videoTrack) {
        const videoElement = document.createElement('video');
        videoElement.srcObject = new MediaStream([videoTrack]);
        videoElement.onloadedmetadata = () => {
          this.canvas!.width = videoElement.videoWidth;
          this.canvas!.height = videoElement.videoHeight;
          videoElement.onloadeddata = () => {
            this.canvas!.getContext('2d')!.drawImage(videoElement, 0, 0);
            const dataUrl = this.canvas!.toDataURL('image/png');
            console.log(dataUrl);
            // const a = document.createElement('a');
            // document.body.appendChild(a);
            // a.href = dataUrl;
            // a.download = 'screenshot.png';
            // a.click();
            // a.remove();
            videoElement.remove();
          };
          videoElement.play().catch(error => {
            console.error('Error playing video:', error);
          });
        };
      }
    }
  }

  stopRecording() {
    if (this.recorder && this.stream) {
      this.recorder.stop();
      if (this.canvas) {
        this.canvas.remove();
      }
      this.startButton = false;
      this.stopButton = true;
    } else {
      console.warn('Recorder or stream not available.');
    }
  }

  onLogout() {
    localStorage.clear();
    this.router.navigate(['/auth/login'])
  }


  constructor(public datepipe: DatePipe, private router: Router, private time: TimeService) { }

  Today: Date = new Date();
  currentTime: string = '';
  checkInTime: Date | null = null;
  checkOutTime: Date | null = null;
  timer: any;
  remainingTime: number = 0;
  intime: Date | null = null;
  outtime: Date | null = null;
  times: number = 0;
  diffMinutes: number = 0;
  progress: number = 0;
  totalprogress: number = 0;
  totalTime: number = 0;
  checkInBtnDisabled: boolean = false;
  checkOutBtnDisabled: boolean = true;
  flagIn: boolean = false;
  flagOut: boolean = false;
  ngOnInit() {
    const storedCheckInTime = localStorage.getItem('checkInTime');
    if (storedCheckInTime) {
      this.checkInTime = new Date(storedCheckInTime);
      this.updateTime();
      this.timer = setInterval(() => this.updateTime(), 1000);
      this.checkInBtnDisabled = true;
      this.checkOutBtnDisabled = false;
    }
  }
  itime: string = ''
  iday: string = ''
  idate: string = ''
  gettime: Date | null = null;
  checkIn(): void {
    this.flagIn = true;
    if (!this.checkInTime) {
      this.checkInTime = new Date();
      this.itime = this.datepipe.transform(this.checkInTime, 'HH:mm:ss') || '';
      this.iday = this.datepipe.transform(this.checkInTime, 'EEEE') || '';
      this.idate = this.datepipe.transform(this.checkInTime, 'yyyy-MM-dd') || '';
      // console.log(this.idate)
      localStorage.setItem('checkInTime', this.checkInTime.toJSON());
    }
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);
    this.checkInBtnDisabled = true;
    this.checkOutBtnDisabled = false;
  }

  updateTime(): void {
    const now = new Date();
    const diffSeconds = this.checkInTime ? Math.floor((now.getTime() - this.checkInTime.getTime()) / 1000) + this.remainingTime : 0;
    this.currentTime = this.secondsToTime(diffSeconds);
    if (this.checkInTime) {
      const totalSeconds = Math.floor((now.getTime() - this.checkInTime.getTime()) / 1000);
      // console.log('Total seconds:', totalSeconds);
      this.progress = this.totalprogress + (totalSeconds / 32400) * 100;
      // console.log('Progress:', this.progress);
    }
  }

  secondsToTime(seconds: number): string {
    let hours: any = Math.floor(seconds / 3600);
    let minutes: any = Math.floor((seconds % 3600) / 60);
    let remainingSeconds: any = seconds % 60;

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    remainingSeconds = (remainingSeconds < 10) ? "0" + remainingSeconds : remainingSeconds;

    return hours + ":" + minutes + ":" + remainingSeconds;
  }

  otime: string = ''
  oday: string = ''
  odate: string = ''
  checkOut(): void {
    this.flagOut = true;
    clearInterval(this.timer);
    this.checkOutTime = new Date();
    this.otime = this.datepipe.transform(this.checkOutTime, 'HH:mm:ss') || '';
    this.oday = this.datepipe.transform(this.checkOutTime, 'EEEE') || '';
    this.odate = this.datepipe.transform(this.checkOutTime, 'yyyy-MM-dd') || '';
    // console.log(this.odate)
    this.timeCheck(this.iday, this.idate, this.itime, this.odate, this.oday, this.otime);
    if (this.checkInTime) {
      const diffSeconds = Math.floor((this.checkOutTime.getTime() - this.checkInTime.getTime()) / 1000);
      this.remainingTime += diffSeconds;
      this.diffMinutes = diffSeconds / 60;
      this.totalTime += this.diffMinutes;
      console.log(`Difference in minutes: ${this.diffMinutes}`);
      console.log(`TotalTime: ${this.totalTime}`);
    }
    this.totalprogress = this.progress;
    this.checkInTime = null;
    localStorage.removeItem('checkInTime');
    this.checkInBtnDisabled = false;
    this.checkOutBtnDisabled = true;
  }

  flagToday: boolean = true;
  flagWeek: boolean = false;

  weekDays: Array<string> = ["Sun", "Mon", "Tue", "Wed", "Thur", "Fri", "Sat"];
  onToday() {
    this.flagWeek = false;
    this.flagToday = true;
  }
  onWeek() {
    this.flagToday = false;
    this.flagWeek = true;
  }

  checkInAr: string[] = []
  checkOutAr: string[] = []
  timeCheck(iday: string, idate: string, itime: string, oday: string, odate: string, otime: string) {
    const day = iday;
    const date = idate;
    const data: Time = { day, date, Status: { checkIn: this.checkInAr, checkOut: this.checkOutAr } };
    if (this.idate === this.odate &&  localStorage.getItem('userDetails')) {
      data.Status.checkIn.push(itime);
      data.Status.checkOut.push(otime);
    }
    else {
      alert("error")
    }
    this.time.timeConsole(data).subscribe(res => {
      console.log(res);
    });
  }
}
