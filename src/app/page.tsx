'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { Upload, Clock, Trophy, ChevronRight, ChevronLeft, X, Star } from 'lucide-react';
import SlotMachine from '@/components/SlotMachine';
import { saveEntry, getEntries, getTodayEntries, type Entry } from '@/lib/supabase';

type Step = 'account' | 'amount' | 'upload' | 'wheel' | 'result';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('account');
  const [username, setUsername] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<string>('');
  const [currentTime, setCurrentTime] = useState('');
  const [prizeWon, setPrizeWon] = useState<number>(0);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [sharedPrize, setSharedPrize] = useState<{ username: string; prize: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadEntries = async () => {
    try {
      const data = await getEntries();
      setEntries(data);
      console.log('Loaded entries on main page:', data.length);
    } catch (error) {
      console.error('Error loading entries on main page:', error);
      setEntries([]);
    }
  };

  useEffect(() => {
    loadEntries();

    // Check for shared prize in URL
    const params = new URLSearchParams(window.location.search);
    const sharedUsername = params.get('username');
    const sharedPrizeAmount = params.get('prize');

    if (sharedUsername && sharedPrizeAmount !== null) {
      setSharedPrize({
        username: decodeURIComponent(sharedUsername),
        prize: Number(sharedPrizeAmount)
      });
    }
  }, []);

  useEffect(() => {
    if (currentStep === 'account') {
      loadEntries();
    }
  }, [currentStep]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const date = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${year}年${month}月${date}日 ${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerConfetti = (level: 'big' | 'medium') => {
    const base = { spread: 70, origin: { y: 0.6 } } as const;
    if (level === 'big') {
      confetti({ ...base, particleCount: 140, colors: ['#00f5ff', '#ff5ef8', '#7cff84', '#ffffff'] });
      setTimeout(() => confetti({ ...base, particleCount: 120, colors: ['#00f5ff', '#ff5ef8', '#7cff84'] }), 200);
      setTimeout(() => confetti({ ...base, particleCount: 100, colors: ['#00f5ff', '#ff5ef8'] }), 400);
    } else {
      confetti({ ...base, particleCount: 80, colors: ['#00f5ff', '#ff5ef8'] });
    }
  };

  const playWinSound = (level: 'big' | 'medium') => {
    try {
      const AudioCtx: typeof AudioContext =
        (window as unknown as { AudioContext: typeof AudioContext }).AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();

      const beep = (freq: number, startTime: number, duration = 0.15, volume = 0.2) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.value = volume;
        osc.connect(gain);
        gain.connect(ctx.destination);
        const t = ctx.currentTime + startTime;
        osc.start(t);
        osc.stop(t + duration);
      };

      if (level === 'big') {
        beep(440, 0);
        beep(660, 0.12);
        beep(880, 0.24, 0.25);
      } else {
        beep(440, 0);
        beep(660, 0.12);
      }
    } catch {}
  };

  const handleShare = async () => {
    const prizeText = prizeWon === 0 ? '馬逼簽名' : `${prizeWon}獎金`;
    const shareText = `${username}在抽獎中獲得了${prizeText}！隔天統一派彩喔~`;

    // Create share URL with query parameters
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${baseUrl}?username=${encodeURIComponent(username)}&prize=${prizeWon}`;
    const fullShareText = `${shareText}\n${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: '恭喜中獎！',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.log('Share cancelled');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(fullShareText);
        alert('已複製到剪貼簿！');
      } catch (error) {
        console.error('Failed to copy:', error);
        alert('無法分享，請手動複製：' + fullShareText);
      }
    }
  };

  const handleSaveEntry = async (prize: number) => {
    const entry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      username: username,
      amount: selectedAmount,
      image: uploadedImage || '',
      prize: prize,
    };

    console.log('Saving new entry:', {
      username: entry.username,
      amount: entry.amount,
      prize: entry.prize,
      hasImage: !!entry.image,
      imageLength: entry.image?.length || 0
    });

    try {
      await saveEntry(entry);
      console.log('Entry saved successfully to Supabase');
      await loadEntries();
    } catch (error) {
      console.error('Failed to save entry:', error);
    }
  };

  const handleSlotWin = async (prizeNumber: number) => {
    setPrizeWon(prizeNumber);

    await handleSaveEntry(prizeNumber);

    const level = prizeNumber >= 666 ? 'big' : prizeNumber >= 168 ? 'medium' : undefined;
    if (level) {
      triggerConfetti(level);
      playWinSound(level);
    }

    setTimeout(() => setCurrentStep('result'), 2000);
  };

  const getPrizeDisplay = () => {
    if (selectedAmount === '1000') {
      return [
        { name: '58獎金', prob: '80', color: 'cyan' },
        { name: '168獎金', prob: '10', color: 'pink' },
        { name: '馬逼簽名', prob: '9.5', color: 'purple' },
        { name: '666獎金', prob: '0.5', color: 'green' },
      ];
    } else if (selectedAmount === '5000') {
      return [
        { name: '188獎金', prob: '80', color: 'cyan' },
        { name: '388獎金', prob: '10', color: 'pink' },
        { name: '馬逼簽名', prob: '9.5', color: 'purple' },
        { name: '1688獎金', prob: '0.5', color: 'green' },
      ];
    } else {
      return [
        { name: '388獎金', prob: '80', color: 'cyan' },
        { name: '666獎金', prob: '10', color: 'pink' },
        { name: '馬逼簽名', prob: '9.5', color: 'purple' },
        { name: '2888獎金', prob: '0.5', color: 'green' },
      ];
    }
  };

  const getStepNumber = (step: Step): number => {
    switch(step) {
      case 'account': return 1;
      case 'amount': return 2;
      case 'upload': return 3;
      case 'wheel': return 4;
      case 'result': return 4;
      default: return 1;
    }
  };

  const isStepActive = (stepNum: number): boolean => {
    const currentStepNum = getStepNumber(currentStep);
    return stepNum <= currentStepNum;
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative z-10">
      <div className="w-full max-w-4xl relative z-10">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="https://ugc.same-assets.com/Wgy3XMwJRp_zBjB34IpeQzg-aKC9UI2Y.png"
              alt="Horse Logo"
              className="w-16 h-16 crown-icon object-contain"
            />
            <h1 className="text-4xl md:text-5xl font-bold gold-gradient">
              馬來迎富
            </h1>
            <img
              src="https://ugc.same-assets.com/PrZZ8s3gIYazuPD-glpJvNtfe7Eb5dVI.png"
              alt="Horse Logo"
              className="w-16 h-16 crown-icon object-contain"
              style={{ animationDelay: '0.5s' }}
            />
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-yellow-500/80 mb-2">
            每日儲值輪盤簽到活動
          </h2>
          <p className="text-yellow-500/60">
            每日儲值1000元以上即可抽獎，需上傳儲值證明
          </p>
        </div>

        <div className="luxury-card rounded-2xl p-6 md:p-8">
          {currentStep !== 'result' && (
            <div className="step-indicator mb-8">
              <div className={`step ${isStepActive(1) ? 'active' : ''}`}>
                <div className="step-number">1</div>
                <div className="step-text">帳號確認</div>
              </div>
              <div className={`step ${isStepActive(2) ? 'active' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-text">選擇金額</div>
              </div>
              <div className={`step ${isStepActive(3) ? 'active' : ''}`}>
                <div className="step-number">3</div>
                <div className="step-text">上傳照片</div>
              </div>
              <div className={`step ${isStepActive(4) ? 'active' : ''}`}>
                <div className="step-number">4</div>
                <div className="step-text">開始抽獎</div>
              </div>
            </div>
          )}

          {currentStep === 'account' && (
            <div className="space-y-6">
              <div className="luxury-card rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">現在時間</span>
                </div>
                <div className="text-2xl font-bold gold-gradient">
                  {currentTime}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-yellow-500 font-semibold">
                  請輸入您的3A/朕天下帳號
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl luxury-input outline-none"
                  placeholder="請輸入帳號"
                />
              </div>

              <button
                onClick={() => username && setCurrentStep('amount')}
                disabled={!username}
                className="w-full luxury-button py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                確認帳號
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {currentStep === 'amount' && (
            <div className="space-y-6">
              <div className="luxury-card rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <Trophy className="w-5 h-5" />
                  <span className="font-semibold">選擇今日儲值金額</span>
                </div>
                <p className="text-yellow-500/70">
                  請選擇您今日的儲值金額以參加對應的抽獎活動
                </p>
              </div>

              <div className="amount-selection">
                <div
                  className={`amount-option ${selectedAmount === '1000' ? 'selected' : ''}`}
                  onClick={() => setSelectedAmount('1000')}
                >
                  <div className="amount-title">今日$1,000</div>
                  <div className="amount-subtitle">基礎獎池</div>
                </div>
                <div
                  className={`amount-option ${selectedAmount === '5000' ? 'selected' : ''}`}
                  onClick={() => setSelectedAmount('5000')}
                >
                  <div className="amount-title">今日$5,000</div>
                  <div className="amount-subtitle">高級獎池</div>
                </div>
                <div
                  className={`amount-option ${selectedAmount === '10000' ? 'selected' : ''}`}
                  onClick={() => setSelectedAmount('10000')}
                >
                  <div className="amount-title">今日$10,000</div>
                  <div className="amount-subtitle">豪華獎池</div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('account')}
                  className="flex-1 py-3 rounded-xl bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  上一步
                </button>
                <button
                  onClick={() => selectedAmount && setCurrentStep('upload')}
                  disabled={!selectedAmount}
                  className="flex-1 luxury-button py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  下一步
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 'upload' && (
            <div className="space-y-6">
              <div className="luxury-card rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <Star className="w-5 h-5" />
                  <span className="font-semibold">重要說明</span>
                </div>
                <p className="text-yellow-500/70">
                  請上傳當日儲值1000元以上的證明照片，未上傳儲值證明不派彩。
                </p>
              </div>

              {!uploadedImage ? (
                <div
                  className="upload-area"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className="w-16 h-16 mx-auto mb-4 text-yellow-500/50" />
                  <p className="text-yellow-500 font-semibold mb-2">上傳儲值證明照片</p>
                  <p className="text-yellow-500/50 text-sm">點擊或拖拽照片到此處</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={uploadedImage}
                      alt="Uploaded"
                      className="w-full h-64 object-cover"
                    />
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-2 right-2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition"
                    >
                      <X className="w-5 h-5 text-yellow-500" />
                    </button>
                  </div>
                  <button
                    onClick={() => setUploadedImage(null)}
                    className="w-full py-2 rounded-xl bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition"
                  >
                    重新上傳
                  </button>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => setCurrentStep('amount')}
                  className="flex-1 py-3 rounded-xl bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  上一步
                </button>
                <button
                  onClick={() => uploadedImage && setCurrentStep('wheel')}
                  disabled={!uploadedImage}
                  className="flex-1 luxury-button py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  下一步
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {currentStep === 'wheel' && (
            <div className="space-y-6">
              <div className="luxury-card rounded-xl p-4">
                <div className="flex items-center gap-2 text-yellow-500 mb-2">
                  <Trophy className="w-5 h-5" />
                  <span className="font-semibold">獎項說明</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {getPrizeDisplay().map((prize, index) => (
                    <div
                      key={index}
                      className={`text-center p-3 rounded-lg ${
                        prize.color === 'cyan'
                          ? 'bg-cyan-500/10'
                          : prize.color === 'pink'
                          ? 'bg-pink-500/10'
                          : prize.color === 'purple'
                          ? 'bg-purple-500/10'
                          : 'bg-green-400/10'
                      }`}
                    >
                      <div
                        className={`font-bold ${
                          prize.color === 'cyan'
                            ? 'text-cyan-400'
                            : prize.color === 'pink'
                            ? 'text-pink-400'
                            : prize.color === 'purple'
                            ? 'text-purple-400'
                            : 'text-green-400'
                        }`}
                      >
                        {prize.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <SlotMachine selectedAmount={selectedAmount} onWin={handleSlotWin} />
            </div>
          )}

          {currentStep === 'result' && (
            <div className="text-center space-y-6">
              <div className="py-8">
                <Trophy className="w-24 h-24 mx-auto mb-4 text-yellow-500" />
                <h2 className="text-3xl font-bold gold-gradient mb-4">恭喜中獎！</h2>
                <div className="text-5xl font-bold gold-gradient mb-2">
                  {prizeWon === 0 ? '馬逼簽名' : `${prizeWon}獎金`}
                </div>
                <p className="text-yellow-500/70">隔天統一派彩喔~</p>
              </div>

              <div className="flex gap-4">
                <Link
                  href="/"
                  onClick={() => setCurrentStep('account')}
                  className="flex-1 py-3 rounded-xl bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 transition text-center"
                >
                  回到首頁
                </Link>
                <button onClick={handleShare} className="flex-1 luxury-button py-3 rounded-xl">分享</button>
              </div>
            </div>
          )}

          <div className="mt-8 luxury-card rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-500 mb-4">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold">今日抽獎紀錄</span>
            </div>
            <div className="space-y-3">
              {entries.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length === 0 ? (
                <div className="py-4 text-center text-yellow-500/50">今日尚無紀錄</div>
              ) : (
                entries
                  .filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString())
                  .map((record) => {
                    // Mask username for privacy
                    const maskedUsername = record.username && record.username.length > 0
                      ? record.username.charAt(0) + '***'
                      : '***';

                    return (
                      <div key={record.id} className="flex justify-between items-center py-2 border-b border-yellow-500/20 last:border-0">
                        <span className="text-yellow-500/70 font-semibold">{maskedUsername}</span>
                        <span className="font-bold gold-gradient">
                          {record.prize === 0 ? '馬逼簽名' : `${record.prize} 獎金`}
                        </span>
                        <span className="text-yellow-500/50 text-sm">
                          {new Date(record.timestamp).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/admin"
            className="text-yellow-500/20 hover:text-yellow-500/40 text-xs transition"
          >
            Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
