export class UserRoutine {

  constructor(_fps = 30){

    this.fps = _fps;
    this.fpsInterval = 1000 / this.fps;

    this.stop = false;
    this.frameCount = 0;

    this.startTime;
    this.now;
    this.then;
    this.elapsed;

    this.isStarted = false;

    this.myReq;
  }

  setFPS(_fps){ 
    if (_fps > 0) {
      this.pause()
      this.fps = _fps;
      this.fpsInterval = 1000 / this.fps;
      this.play()
    }
  }

  start(){

    if(this.isStarted){ console.warn("User routine is already started"); return; }

    this.then = window.performance.now();
    this.startTime = this.then;
    this.animate();
  }

  animate(_t){

      this.myReq = requestAnimationFrame((t) => this.animate(t));

      this.now = _t;
      this.elapsed = this.now - this.then;

      if (this.elapsed > this.fpsInterval) {
        
        // Get ready for next frame by setting then=now, but...
        // Also, adjust for fpsInterval not being multiple of 16.67
        this.then = this.now - (this.elapsed % this.fpsInterval);

        // draw stuff here
        this.onUpdateStateChange();

        // FOR TESTING...Report #seconds since start and achieved fps.
        // const sinceStart = this.now - this.startTime;
        // const currentFps = Math.round(1000 / (sinceStart / ++this.frameCount) * 100) / 100;
        // console.log("Elapsed time= " + Math.round(sinceStart / 1000 * 100) / 100 + " secs @ " + currentFps + " fps.");
          
      }
  }

  pause(){
    cancelAnimationFrame(this.myReq);
  }

  play(){
    if(!this.isStarted){
      this.start();
    } else {
      this.then = window.performance.now();
      this.startTime = this.then;
      this.animate();
    }
  }

  //play next frame
  next(){
    this.onUpdateStateChange();
  }

  onUpdateStateChange(){}
  update(listener){
    this.onUpdateStateChange = listener;
  }

}
