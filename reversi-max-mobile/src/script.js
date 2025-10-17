(function() {
const N = 8;
const dirs = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

let board=[],current=1,aiEnabled=false,twoPlayer=false,aiDepth=1,gameEnded=false,tutorialMode=false,tutorialStep=0,armageddonMode=false,turnTimer=null,turnTimeLeft=30;

// 아마겟돈 모드용 누적 시간 (3분 = 180초)
let blackTime = 180;
let whiteTime = 180;

const tutorialOpponentMoves = [[2,4], [2,2], [5,4]];

const boardEl=document.getElementById('board'),tutorialGuideEl=document.getElementById('tutorialGuide'),turnTimerEl=document.getElementById('turnTimer');
const blackScoreEl=document.getElementById('blackScore'),whiteScoreEl=document.getElementById('whiteScore');
const gameOverEl=document.getElementById('gameOver'), gameContainerEl=document.getElementById('gameContainer'), mainMenuEl=document.getElementById('mainMenu');
const tutorialModalEl=document.getElementById('tutorialModal');
const WEIGHTS = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [ 10, -5, 8, 3, 3, 8, -5, 10],
  [ 5, -5, 3, 1, 1, 3, -5, 5],
  [ 5, -5, 3, 1, 1, 3, -5, 5],
  [ 10, -5, 8, 3, 3, 8, -5, 10],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [100, -20, 10, 5, 5, 10, -20, 100]
];
const TUTORIAL_STEPS = [
  { message: "환영합니다! 흑돌(검은색)로 시작해요.<br>하이라이트된 (2,3) 칸을 클릭하세요.", highlight: [2,3] },
  { message: "잘했어요! 상대가 수를 두었습니다.<br>이번엔 (4,5) 칸에 놓아보세요.", highlight: [4,5] },
  { message: "훌륭해요! 연쇄 뒤집기를 봤나요?<br>(1,5) 칸에 놓으면 대각선으로 뒤집힙니다.", highlight: [1,5] },
  { message: "완벽해요! 이제 자유롭게 플레이해보세요.<br>코너와 가장자리가 중요합니다!", highlight: null },
  { message: "튜토리얼 완료! 🎉<br>이제 AI와 대결해볼까요?", highlight: null }
];
function inBounds(r,c){return r>=0&&c>=0&&r<N&&c<N;}
function idx(r,c){return r*N+c;}
function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
function startTurnTimer() {
  if (turnTimer) clearInterval(turnTimer);

  if (tutorialMode || gameEnded) {
    turnTimerEl.classList.remove('show');
    return;
  }

  if (armageddonMode) {
    turnTimeLeft = current === 1 ? blackTime : whiteTime;
  } else {
    turnTimeLeft = 30;
  }

  turnTimerEl.textContent = armageddonMode ? formatTime(turnTimeLeft) : turnTimeLeft;
  turnTimerEl.classList.add('show');

  turnTimer = setInterval(() => {
    if (gameEnded) {
      stopTurnTimer();
      return;
    }
    
    turnTimeLeft--;

    if (armageddonMode) {
      if (current === 1) blackTime = turnTimeLeft;
      else whiteTime = turnTimeLeft;
      turnTimerEl.textContent = formatTime(turnTimeLeft);
    } else {
      turnTimerEl.textContent = turnTimeLeft;
    }

    if (turnTimeLeft <= 0) {
      clearInterval(turnTimer);
      turnTimerEl.classList.remove('show');

      if (armageddonMode) {
        const timeOutWinner = current === 1 ? -1 : 1;
        endGame(0, 0, timeOutWinner, 'timeout');
      } else {
        // 턴 타임아웃 - 패스 처리
        current = -current;
        afterTurn();
      }
    }
  }, 1000);
}
function stopTurnTimer() {
  if (turnTimer) {
    clearInterval(turnTimer);
    turnTimer = null;
  }
  turnTimerEl.classList.remove('show');
}
function initBoard(){
  board=Array.from({length:N},()=>Array(N).fill(0));
  board[3][3]=-1;board[3][4]=1;board[4][3]=1;board[4][4]=-1;
  current=1;
  gameEnded=false;
  tutorialStep=0;
  stopTurnTimer();
  gameOverEl.classList.remove('show');
  tutorialGuideEl.classList.remove('show');

  if (armageddonMode) {
    blackTime = 180;
    whiteTime = 180;
  }
  
  render();
  updateScores();
  
  if(tutorialMode) {
    updateTutorialGuide();
  } else {
    startTurnTimer();
  }
}
function updateTutorialGuide() {
  if (!tutorialMode) return;
  const step = TUTORIAL_STEPS[tutorialStep];
  tutorialGuideEl.innerHTML = step.message;
  tutorialGuideEl.classList.add('show');
  
  if (tutorialStep === TUTORIAL_STEPS.length - 1) {
    setTimeout(() => {
      // 튜토리얼 완료 후 AI 대전으로 전환
      tutorialMode = false;
      aiEnabled = true;
      twoPlayer = false;
      document.getElementById('aiSettings').style.display='block';
      document.getElementById('depth').value = 2;
      aiDepth = 2;
      tutorialGuideEl.classList.remove('show');
      initBoard();
    }, 2500);
  }
  render();
}
function checkTutorialProgress(r, c, player) {
  if (!tutorialMode) return;
  const step = TUTORIAL_STEPS[tutorialStep];
  
  // 하이라이트가 있는 경우 정확한 위치만 허용
  if (step.highlight && (r !== step.highlight[0] || c !== step.highlight[1])) {
    return;
  }
  
  tutorialStep++;
  if (tutorialStep < TUTORIAL_STEPS.length) {
    setTimeout(() => updateTutorialGuide(), 800);
  }
}
function updateScores(){
  let black=0,white=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(board[r][c]===1)black++;
    if(board[r][c]===-1)white++;
  }
  blackScoreEl.querySelector('.score-value').textContent=black;
  whiteScoreEl.querySelector('.score-value').textContent=white;
  blackScoreEl.classList.toggle('active',current===1);
  whiteScoreEl.classList.toggle('active',current===-1);
}
function endGame(black,white, timeOutWinner=0, reason='score'){
  gameEnded=true;
  let result;
  let finalBlack = black, finalWhite = white;
  
  if(reason === 'timeout'){
    if(timeOutWinner === 1){
      result='흑돌 승리! (상대 시간 초과)';
      finalBlack = 64; finalWhite = 0;
    } else {
      result='백돌 승리! (상대 시간 초과)';
      finalBlack = 0; finalWhite = 64;
    }
  } else if(black>white){
    result='흑돌 승리!';
  } else if(white>black){
    result='백돌 승리!';
  } else {
    if(armageddonMode){
      result='흑돌 승리! (아마겟돈 무승부 규칙)';
    } else {
      result='무승부!';
    }
  }
  document.getElementById('gameResult').textContent=result;
  document.getElementById('gameFinalScore').textContent=`흑 ${finalBlack} : ${finalWhite} 백`;
  gameOverEl.classList.add('show');
  if(tutorialMode) tutorialGuideEl.classList.remove('show');
  stopTurnTimer();
}
function afterTurn(){
  stopTurnTimer();
  
  if (gameEnded) return; // 게임이 이미 종료된 경우 리턴
  
  let passes = 0;
  while(passes < 2 && getValidMoves(board, current).length === 0){
    current = -current;
    passes++;
  }
  if(passes === 2){
    let black=0, white=0;
    for(let r=0;r<N;r++)for(let c=0;c<N;c++){
      if(board[r][c]===1)black++;
      if(board[r][c]===-1)white++;
    }
    endGame(black, white);
    return;
  }
  
  updateScores();
  render();
  
  if (tutorialMode && current === -1 && tutorialStep <= 3) {
    const opponentIndex = tutorialStep - 1;
    const oppMove = tutorialOpponentMoves[opponentIndex];
    if (oppMove) {
      const [or, oc] = oppMove;
      setTimeout(async () => {
        if (gameEnded) return;
        await placeAndResolve(or, oc, current);
        current = -current;
        afterTurn();
      }, 600);
      return;
    }
  }
  
  if (!tutorialMode && !gameEnded) {
    startTurnTimer();
  }
  
  if (tutorialMode) updateTutorialGuide();
  
  // AI 턴 처리
  if (!gameEnded && !twoPlayer && aiEnabled && current === -1) {
    setTimeout(aiMove, 400);
  }
}
function render(){
  boardEl.innerHTML='';
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    const cell=document.createElement('div');
    cell.className='cell'+(board[r][c]===0?' empty':'');
    const isDisabled = gameEnded || (!twoPlayer && aiEnabled && current===-1);
    if(isDisabled)cell.classList.add('disabled');
    if (tutorialMode && !isDisabled) {
      const step = TUTORIAL_STEPS[tutorialStep];
      if (step.highlight && r === step.highlight[0] && c === step.highlight[1]) {
        cell.classList.add('tutorial-highlight');
      }
    }
    cell.dataset.r=r;cell.dataset.c=c;
    cell.onclick=onCellClick;
    if(board[r][c]){
      const d=document.createElement('div');
      d.className='disk '+(board[r][c]===1?'black':'white');
      cell.appendChild(d);
    }
    boardEl.appendChild(cell);
  }
}
function isValidMove(r, c, player, b){
  for(const [dr, dc] of dirs){
    let rr = r + dr, cc = c + dc;
    let hasOpp = false;
    while(inBounds(rr, cc) && b[rr][cc] === -player){
      hasOpp = true;
      rr += dr;
      cc += dc;
    }
    if(hasOpp && inBounds(rr, cc) && b[rr][cc] === player){
      return true;
    }
  }
  return false;
}
async function onCellClick(e){
  if(gameEnded)return;
  if(!twoPlayer && aiEnabled && current===-1)return;
  const r=+e.currentTarget.dataset.r,c=+e.currentTarget.dataset.c;
  if(board[r][c]!==0)return;
  if(!isValidMove(r, c, current, board))return;
  
  // 튜토리얼 모드에서 하이라이트된 칸이 아닌 곳을 클릭한 경우
  if(tutorialMode){
    const step = TUTORIAL_STEPS[tutorialStep];
    if(step.highlight && (r !== step.highlight[0] || c !== step.highlight[1])){
      // 잘못된 위치 클릭 - 무시
      return;
    }
  }
  
  stopTurnTimer();
  await placeAndResolve(r,c,current);
  checkTutorialProgress(r, c, current);
  current = -current;
  afterTurn();
}
async function placeAndResolve(r,c,player){
  board[r][c]=player;render();
  const queue=[[r,c]];
  while(queue.length){
    const [sr,sc]=queue.shift();
    const flips=[];
    for(const [dr,dc] of dirs){
      const tmp=[];
      let rr=sr+dr,cc=sc+dc;
      while(inBounds(rr,cc)&&board[rr][cc]===-player){tmp.push([rr,cc]);rr+=dr;cc+=dc;}
      if(tmp.length>0&&inBounds(rr,cc)&&board[rr][cc]===player)flips.push(...tmp);
    }
    for(const [fr,fc] of flips){
      await animateFlip(fr,fc,player);
      board[fr][fc]=player;render();
      queue.push([fr,fc]);
    }
  }
}
function animateFlip(r,c,player){
  return new Promise(res=>{
    const cell=boardEl.children[idx(r,c)];
    const disk=cell.querySelector('.disk');
    disk.classList.add('flipping');
    setTimeout(()=>{
      disk.classList.toggle('black',player===1);
      disk.classList.toggle('white',player===-1);
      disk.classList.remove('flipping');
      setTimeout(res,120);
    },120);
  });
}
function copyBoard(b){return b.map(row=>[...row]);}
function simulatePlacement(b,r,c,player){
  if(b[r][c]!==0)return null;
  const nb=copyBoard(b);
  nb[r][c]=player;
  const queue=[[r,c]];
  while(queue.length){
    const [sr,sc]=queue.shift();
    for(const [dr,dc] of dirs){
      const tmp=[];
      let rr=sr+dr,cc=sc+dc;
      while(inBounds(rr,cc)&&nb[rr][cc]===-player){tmp.push([rr,cc]);rr+=dr;cc+=dc;}
      if(tmp.length>0&&inBounds(rr,cc)&&nb[rr][cc]===player){
        for(const [x,y] of tmp){nb[x][y]=player;queue.push([x,y]);}
      }
    }
  }
  return nb;
}
function evaluateBoard(b,player){
  let score=0,myDisks=0,oppDisks=0;
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(b[r][c]===player){myDisks++;score+=WEIGHTS[r][c];}
    else if(b[r][c]===-player){oppDisks++;score-=WEIGHTS[r][c];}
  }
  score+=(myDisks-oppDisks)*2;
  const myMoves=getValidMoves(b,player).length;
  const oppMoves=getValidMoves(b,-player).length;
  score+=(myMoves-oppMoves)*5;
  return score;
}
function getValidMoves(b,player){
  const moves=[];
  for(let r=0;r<N;r++)for(let c=0;c<N;c++){
    if(b[r][c]===0 && isValidMove(r,c,player,b))moves.push([r,c]);
  }
  return moves;
}
function minimax(b,depth,alpha,beta,maximizing,player){
  if(depth===0)return evaluateBoard(b,player);
  const moves=getValidMoves(b,maximizing?player:-player);
  if(moves.length===0)return evaluateBoard(b,player);
  if(maximizing){
    let maxEval=-Infinity;
    for(const [r,c] of moves){
      const nb=simulatePlacement(b,r,c,player);
      if(!nb)continue;
      const ev=minimax(nb,depth-1,alpha,beta,false,player);
      maxEval=Math.max(maxEval,ev);
      alpha=Math.max(alpha,ev);
      if(beta<=alpha)break;
    }
    return maxEval;
  }else{
    let minEval=Infinity;
    for(const [r,c] of moves){
      const nb=simulatePlacement(b,r,c,-player);
      if(!nb)continue;
      const ev=minimax(nb,depth-1,alpha,beta,true,player);
      minEval=Math.min(minEval,ev);
      beta=Math.min(beta,ev);
      if(beta<=alpha)break;
    }
    return minEval;
  }
}
async function aiMove(){
  if (gameEnded) return; // 게임 종료 확인
  
  const player=-1;
  if(current !== player) return;
  
  tutorialGuideEl.innerHTML = 'AI 생각 중...';
  tutorialGuideEl.classList.add('show');
  
  const aiTimeout = setTimeout(() => {
    if (gameEnded) return;
    tutorialGuideEl.classList.remove('show');
    current = 1;
    afterTurn();
  }, 10000);
  
  setTimeout(async ()=>{
    if (gameEnded) {
      clearTimeout(aiTimeout);
      tutorialGuideEl.classList.remove('show');
      return;
    }
    
    const moves=getValidMoves(board,player);
    if(moves.length===0){
      clearTimeout(aiTimeout);
      tutorialGuideEl.classList.remove('show');
      current = -current;
      afterTurn();
      return;
    }
  
    let bestMove=null,bestScore=-Infinity;
    const depth=Math.min(aiDepth,6);
  
    const orderedMoves = moves.map(([r,c]) => {
      const nb = simulatePlacement(board, r, c, player);
      if(!nb) return null;
      let score = evaluateBoard(nb, player);
      if (depth === 0) {
        let flippedCount = 0;
        for (let i = 0; i < N; i++) {
          for (let j = 0; j < N; j++) {
            if (nb[i][j] === player && board[i][j] !== player) flippedCount++;
          }
        }
        score = flippedCount * 10 + score;
      }
      return {move: [r,c], nb, score};
    }).filter(Boolean).sort((a,b) => b.score - a.score);
  
    const startTime=Date.now();
  
    if (depth === 0) {
      bestMove = orderedMoves[0].move;
    } else {
      for(const o of orderedMoves){
        if (gameEnded) break;
        const score=minimax(o.nb,depth-1,-Infinity,Infinity,false,player);
        if(score>bestScore){bestScore=score;bestMove=o.move;}
        if(Date.now()-startTime>5000)await new Promise(r=>setTimeout(r,100));
      }
    }
  
    clearTimeout(aiTimeout);
    tutorialGuideEl.classList.remove('show');
  
    if(!bestMove || gameEnded){
      return;
    }
  
    const [r,c]=bestMove;
    await placeAndResolve(r,c,player);
    current = -current;
    afterTurn();
  },100);
}
// 메뉴 이벤트
document.getElementById('tutorialBtn').onclick=()=>{
  tutorialModalEl.classList.add('show');
};
document.getElementById('closeTutorial').onclick=()=>{
  tutorialModalEl.classList.remove('show');
};
document.getElementById('twoPlayerBtn').onclick=()=>{
  tutorialMode=false;
  twoPlayer=true;
  aiEnabled=false;
  armageddonMode=false;
  document.getElementById('aiSettings').style.display='none';
  document.getElementById('depth').value = 1;
  mainMenuEl.style.display='none';
  gameContainerEl.style.display='grid';
  initBoard();
};
document.getElementById('aiBtn').onclick=()=>{
  tutorialMode=false;
  twoPlayer=false;
  aiEnabled=true;
  armageddonMode=false;
  document.getElementById('aiSettings').style.display='block';
  document.getElementById('depth').value = 1;
  mainMenuEl.style.display='none';
  gameContainerEl.style.display='grid';
  initBoard();
};
document.getElementById('armageddonBtn').onclick=()=>{
  tutorialMode=false;
  twoPlayer=false;
  aiEnabled=true;
  armageddonMode=true;
  document.getElementById('aiSettings').style.display='block';
  document.getElementById('depth').value = 4;
  mainMenuEl.style.display='none';
  gameContainerEl.style.display='grid';
  initBoard();
};
function backToMenu() {
  gameContainerEl.style.display='none';
  mainMenuEl.style.display='flex';
  twoPlayer=false;
  aiEnabled=false;
  aiDepth=1;
  tutorialMode=false;
  armageddonMode=false;
  document.getElementById('aiSettings').style.display='none';
  tutorialGuideEl.classList.remove('show');
  stopTurnTimer();
}
document.getElementById('backToMenu').onclick=backToMenu;
document.getElementById('backToMenuGame').onclick=backToMenu;
document.getElementById('reset').onclick=initBoard;
document.getElementById('newGame').onclick=initBoard;
document.getElementById('depth').oninput=function(){
  aiDepth=parseInt(this.value)||1;
};

document.getElementById('startTutorialBtn').onclick = () => {
  tutorialModalEl.classList.remove('show');
  tutorialMode=true;
  twoPlayer=false;
  aiEnabled=false;
  armageddonMode=false;
  document.getElementById('aiSettings').style.display='none';
  mainMenuEl.style.display='none';
  gameContainerEl.style.display='grid';
  initBoard();
};

})();