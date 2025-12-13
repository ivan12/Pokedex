import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X, Loader2, ScanEye, Sparkles, ChevronRight, CheckCircle2, Zap, Palette, Search, Save, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, increment } from 'firebase/firestore';

// --- Semantic Mapping Constants ---
const LABEL_TO_TYPE_MAP = {
  // Water
  'fish': 'water', 'shark': 'water', 'whale': 'water', 'turtle': 'water',
  'sea': 'water', 'ocean': 'water', 'scuba': 'water', 'boat': 'water', 'goldfish': 'water',
  'stingray': 'water', 'dolphin': 'water', 'penguin': 'water',

  // Flying
  'bird': 'flying', 'eagle': 'flying', 'parrot': 'flying', 'owl': 'flying',
  'plane': 'flying', 'kite': 'flying', 'wing': 'flying', 'hummingbird': 'flying',

  // Grass
  'grass': 'grass', 'tree': 'grass', 'plant': 'grass', 'flower': 'grass',
  'leaf': 'grass', 'vegetable': 'grass', 'fruit': 'grass', 'forest': 'grass',
  'mushroom': 'grass', 'daisy': 'grass', 'rose': 'grass',

  // Fire
  'fire': 'fire', 'flame': 'fire', 'smoke': 'fire', 'lighter': 'fire',
  'candle': 'fire', 'volcano': 'fire', 'match': 'fire',

  // Bug
  'insect': 'bug', 'spider': 'bug', 'ant': 'bug', 'bee': 'bug',
  'beetle': 'bug', 'butterfly': 'bug', 'dragonfly': 'bug', 'ladybug': 'bug',

  // Normal 
  'dog': 'normal', 'cat': 'normal', 'mouse': 'normal', 'rat': 'normal',
  'rabbit': 'normal', 'bear': 'normal', 'teddy': 'normal', 'wolf': 'normal',
  'fox': 'normal', 'animal': 'normal',

  // Electric
  'lightning': 'electric', 'plug': 'electric', 'computer': 'electric', 'screen': 'electric',

  // Ice
  'snow': 'ice', 'ice': 'ice', 'ski': 'ice', 'freezer': 'ice',

  // Ground/Rock
  'rock': 'rock', 'stone': 'rock', 'sand': 'ground', 'desert': 'ground', 'mountain': 'rock',

  // Poison
  'snake': 'poison'
};

const COLOR_TO_TYPE_MAP = {
  'red': ['fire', 'fighting', 'bug', 'dragon'],
  'blue': ['water', 'ice', 'dragon', 'flying'],
  'yellow': ['electric', 'ground', 'bug', 'psychic'],
  'green': ['grass', 'bug', 'poison'],
  'purple': ['poison', 'ghost', 'psychic', 'dragon'],
  'brown': ['ground', 'rock', 'fighting', 'normal'],
  'pink': ['fairy', 'psychic', 'normal', 'water'],
  'black': ['dark', 'ghost'],
  'white': ['normal', 'ice', 'steel', 'flying', 'electric'],
  'gray': ['steel', 'rock', 'normal'],
  'orange': ['fire', 'fighting', 'ground']
};

// --- IndexedDB Helper ---
const DB_NAME = 'PokemonAnalysisDB';
const DB_VERSION = 2;
const STORE_NAME = 'embeddings';
const FEEDBACK_STORE_NAME = 'feedback';

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject('Error opening DB');
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FEEDBACK_STORE_NAME)) {
        db.createObjectStore(FEEDBACK_STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

const getEmbeddingFromDB = async (id) => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.embedding : null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    console.error('DB Read Error', e);
    return null;
  }
};

const saveEmbeddingToDB = async (id, embedding) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, embedding });
  } catch (e) {
    console.error('DB Write Error', e);
  }
};

const saveFeedbackToDB = async (embedding, pokemonId) => {
  try {
    const db = await openDB();
    const tx = db.transaction(FEEDBACK_STORE_NAME, 'readwrite');
    const store = tx.objectStore(FEEDBACK_STORE_NAME);
    store.put({
      embedding,
      pokemonId,
      timestamp: Date.now()
    });
  } catch (e) {
    console.error('Feedback Save Error', e);
  }
};

const getAllFeedback = async () => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(FEEDBACK_STORE_NAME, 'readonly');
      const store = tx.objectStore(FEEDBACK_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    console.error('Feedback Read Error', e);
    return [];
  }
};

// --- Global Learning ---
const computeDHash = (imageElement) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 9;
  canvas.height = 8;
  ctx.filter = 'grayscale(100%)';
  ctx.drawImage(imageElement, 0, 0, 9, 8);
  const data = ctx.getImageData(0, 0, 9, 8).data;

  let hash = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      // Simplified hashing logic
      const leftIndex = (row * 9 + col) * 4;
      const rightIndex = (row * 9 + col + 1) * 4;
      const leftAvg = (data[leftIndex] + data[leftIndex + 1] + data[leftIndex + 2]) / 3;
      const rightAvg = (data[rightIndex] + data[rightIndex + 1] + data[rightIndex + 2]) / 3;
      hash += (leftAvg > rightAvg ? '1' : '0');
    }
  }
  return parseInt(hash, 2).toString(16);
};

const getDeviceId = () => {
  let id = localStorage.getItem('pokedex_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('pokedex_device_id', id);
  }
  return id;
};

const saveGlobalFeedback = async (dHash, pokemonId) => {
  try {
    const deviceId = getDeviceId();
    const docRef = doc(firestore, 'global_training', dHash);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      await setDoc(docRef, {
        votes: { [deviceId]: pokemonId },
        lastUpdated: Date.now()
      });
    } else {
      await updateDoc(docRef, {
        [`votes.${deviceId}`]: pokemonId,
        lastUpdated: Date.now()
      });
    }
  } catch (e) {
    console.error('Global Feedback Error', e);
  }
};

const checkGlobalConsensus = async (dHash) => {
  try {
    const docRef = doc(firestore, 'global_training', dHash);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const votes = data.votes || {};
      const voteCounts = {};
      Object.values(votes).forEach(pid => {
        voteCounts[pid] = (voteCounts[pid] || 0) + 1;
      });

      let winnerId = null;
      let maxVotes = 0;
      let totalVotes = 0;

      Object.entries(voteCounts).forEach(([pid, count]) => {
        totalVotes += count;
        if (count > maxVotes) {
          maxVotes = count;
          winnerId = parseInt(pid);
        }
      });

      if (winnerId && maxVotes >= 2 && (maxVotes / totalVotes) > 0.5) {
        return { winnerId, confidence: maxVotes / totalVotes, voters: maxVotes };
      }
    }
  } catch (e) {
    console.warn('Global Brain irrelevant or offline', e);
  }
  return null;
};


// --- Main Component ---

export const ImageSearch = ({ onPokemonFound, pokemonList = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');

  const [aiDescription, setAiDescription] = useState(null);
  const [detectedColor, setDetectedColor] = useState(null);
  const [boostedTypes, setBoostedTypes] = useState([]);
  const [topCandidates, setTopCandidates] = useState([]);

  const [currentEmbedding, setCurrentEmbedding] = useState(null);
  const [currentDHash, setCurrentDHash] = useState(null);

  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualQuery, setManualQuery] = useState('');

  const modelRef = useRef(null);
  const cocoRef = useRef(null);
  const tfRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const embeddingsCache = useRef(new Map());

  const extractDominantColor = (imageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 50;
    canvas.height = 50;
    ctx.drawImage(imageElement, 0, 0, 50, 50);
    const data = ctx.getImageData(0, 0, 50, 50).data;

    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 128) continue;
      r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
    }
    r = Math.round(r / count); g = Math.round(g / count); b = Math.round(b / count);

    if (r > 200 && g > 200 && b > 200) return 'white';
    if (r < 50 && g < 50 && b < 50) return 'black';
    if (Math.abs(r - g) < 20 && Math.abs(r - b) < 20 && r > 100) return 'gray';

    if (r > g && r > b) {
      if (g > 150) return 'orange';
      if (b > 150) return 'pink';
      return 'red';
    }
    if (g > r && g > b) return 'green';
    if (b > r && b > g) return 'blue';
    if (r > b && g > b && r > 150 && g > 150) return 'yellow';
    if (r > g && b > g) return 'purple';
    return 'brown';
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
        setCroppedImage(null);
        setAiDescription(null);
        setDetectedColor(null);
        setBoostedTypes([]);
        setTopCandidates([]);
        setShowManualSearch(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraStarting(true);
    try {
      setIsCameraMode(true);
      setSelectedImage(null);
      setCroppedImage(null);
      setSelectedFile(null);
      setAiDescription(null);
      setDetectedColor(null);
      setBoostedTypes([]);
      setTopCandidates([]);
      setShowManualSearch(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      const attachStream = () => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', true);
        videoRef.current.muted = true;
        const onReady = () => { videoRef.current?.play().catch(() => { }); };
        if (videoRef.current.readyState >= 2) onReady();
        else videoRef.current.onloadedmetadata = onReady;
      };
      requestAnimationFrame(attachStream);
    } catch (error) {
      toast.error('Could not access the camera. Please allow camera permissions.');
    } finally { setIsCameraStarting(false); }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], "captured_pokemon.jpg", { type: "image/jpeg" });
          const imageData = canvas.toDataURL('image/jpeg');
          setSelectedImage(imageData); setSelectedFile(file);
        }
      }, 'image/jpeg', 0.8);
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraMode(false);
  };

  const ensureModel = async () => {
    if (modelRef.current && tfRef.current && cocoRef.current) {
      return { model: modelRef.current, tf: tfRef.current, coco: cocoRef.current };
    }
    setAnalysisStatus('Loading AI models...');
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    tfRef.current = tf;
    const mobilenet = await import('@tensorflow-models/mobilenet');
    if (!modelRef.current) modelRef.current = await mobilenet.load({ version: 2, alpha: 1.0 });
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    if (!cocoRef.current) {
      setAnalysisStatus('Loading Detector...');
      cocoRef.current = await cocoSsd.load();
    }
    return { model: modelRef.current, tf, coco: cocoRef.current };
  };

  const loadImageElement = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const detectAndCrop = async (imageElement, coco) => {
    setAnalysisStatus('Locating Pokemon...');
    const predictions = await coco.detect(imageElement);
    if (!predictions || predictions.length === 0) return imageElement.src;
    let best = predictions[0];
    let maxArea = best.bbox[2] * best.bbox[3];
    for (let i = 1; i < predictions.length; i++) {
      const area = predictions[i].bbox[2] * predictions[i].bbox[3];
      if (area > maxArea) { maxArea = area; best = predictions[i]; }
    }
    const padding = 20;
    const [x, y, w, h] = best.bbox;
    const cropX = Math.max(0, x - padding);
    const cropY = Math.max(0, y - padding);
    const cropW = Math.min(imageElement.width - cropX, w + (padding * 2));
    const cropH = Math.min(imageElement.height - cropY, h + (padding * 2));
    const canvas = document.createElement('canvas');
    canvas.width = cropW; canvas.height = cropH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageElement, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    return canvas.toDataURL('image/jpeg');
  };

  const computeEmbedding = async (src, model, tf) => {
    try {
      const img = await loadImageElement(src);
      const embedding = tf.tidy(() => {
        const input = tf.browser.fromPixels(img).toFloat();
        const resized = tf.image.resizeBilinear(input, [224, 224]);
        const offset = tf.scalar(127.5);
        const normalized = resized.sub(offset).div(offset);
        const batched = normalized.expandDims(0);
        const emb = model.infer(batched, true);
        return emb.squeeze();
      });
      const arr = await embedding.data();
      embedding.dispose();
      return Array.from(arr);
    } catch (err) { return null; }
  };

  const cosineSim = (a, b) => {
    if (!a || !b || a.length !== b.length) return -1;
    let dot = 0; let na = 0; let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-6);
  };

  const processGeneration = async (gen, targetEmb, model, tf, inferredTypes) => {
    if (!targetEmb) return null;
    const genPokemon = pokemonList.filter(p => p.id >= gen.start && p.id <= gen.end);
    const generationMatches = [];
    for (let i = 0; i < genPokemon.length; i++) {
      const p = genPokemon[i];
      let refEmb = embeddingsCache.current.get(p.id);
      if (!refEmb) {
        refEmb = await getEmbeddingFromDB(p.id);
        if (refEmb) embeddingsCache.current.set(p.id, refEmb);
      }
      if (!refEmb) {
        const sprite = p?.sprites?.other?.['official-artwork']?.front_default || p?.sprites?.front_default;
        if (sprite) {
          refEmb = await computeEmbedding(sprite, model, tf);
          if (refEmb) {
            embeddingsCache.current.set(p.id, refEmb);
            saveEmbeddingToDB(p.id, refEmb);
            await new Promise(r => setTimeout(r, 10));
          }
        }
      }
      if (refEmb) {
        let sim = cosineSim(targetEmb, refEmb);
        let contextBoost = 1.0;
        if (inferredTypes && inferredTypes.length > 0 && p.types) {
          const pTypes = p.types.map(t => t.type.name.toLowerCase());
          const hasMatch = inferredTypes.some(t => pTypes.includes(t));
          if (hasMatch) {
            contextBoost = 1.20;
            sim *= contextBoost;
          }
        }
        if (sim > 0.15) {
          generationMatches.push({
            pokemon: p,
            score: sim,
            gen: gen.name,
            isBoosted: contextBoost > 1.0
          });
        }
      }
      if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return generationMatches;
  };

  const findPossibleMatches = async (imageData) => {
    setAnalysisStatus('Loading AI...');
    const { model, tf, coco } = await ensureModel();
    setAnalysisStatus('Scanning Image...');
    const originalImg = await loadImageElement(imageData);
    const croppedDataUrl = await detectAndCrop(originalImg, coco);
    setCroppedImage(croppedDataUrl);
    setAnalysisStatus('Analyzing context & color...');
    const croppedImgEl = await loadImageElement(croppedDataUrl);
    const classifications = await model.classify(croppedImgEl);
    let inferredTypes = [];
    let descriptionLabels = [];
    if (classifications && classifications.length > 0) {
      descriptionLabels = classifications.map(c => c.className.split(',')[0]);
      setAiDescription(descriptionLabels.join(', '));
      classifications.forEach(c => {
        const words = c.className.toLowerCase().split(/[,\s]+/);
        words.forEach(w => {
          if (LABEL_TO_TYPE_MAP[w]) {
            if (!inferredTypes.includes(LABEL_TO_TYPE_MAP[w])) inferredTypes.push(LABEL_TO_TYPE_MAP[w]);
          }
        });
      });
    }
    const domColor = extractDominantColor(croppedImgEl);
    setDetectedColor(domColor);
    if (domColor && COLOR_TO_TYPE_MAP[domColor]) {
      const colorTypes = COLOR_TO_TYPE_MAP[domColor];
      colorTypes.forEach(t => { if (!inferredTypes.includes(t)) inferredTypes.push(t); });
    }
    setBoostedTypes(inferredTypes);
    setAnalysisStatus('Analyzing shape...');
    const targetEmb = await computeEmbedding(croppedDataUrl, model, tf);
    setCurrentEmbedding(targetEmb);
    const dHash = computeDHash(croppedImgEl);
    setCurrentDHash(dHash);
    if (!targetEmb) return [];

    setAnalysisStatus('Consulting Global Brain...');
    const learned = await checkFeedbackStore(targetEmb);
    // note: checkFeedbackStore logic for local is inside the function
    const learnedLocal = await getAllFeedback(); // Quick re-fetch for local
    for (const item of learnedLocal) {
      if (cosineSim(targetEmb, item.embedding) > 0.92) {
        const p = pokemonList.find(px => px.id === item.pokemonId);
        if (p) learned.push({ pokemon: p, score: 0.99, gen: 'Local Memory', isLearned: true, source: 'local' });
      }
    }

    if (dHash) {
      const globalConsensus = await checkGlobalConsensus(dHash);
      if (globalConsensus) {
        const globalP = pokemonList.find(p => p.id === globalConsensus.winnerId);
        if (globalP) {
          learned.push({
            pokemon: globalP,
            score: 0.98,
            gen: `Global (Votes: ${globalConsensus.voters})`,
            isLearned: true,
            source: 'global'
          });
        }
      }
    }
    if (learned.length > 0) {
      return learned.sort((a, b) => b.score - a.score);
    }

    setAnalysisStatus('Matching (1-9)...');
    const promises = generations.map(gen => processGeneration(gen, targetEmb, model, tf, inferredTypes));
    const results = await Promise.all(promises);
    const allMatches = results.flat().filter(r => r !== null);

    // --- TIERED SORTING (Force Context) ---
    // Tier 1: Boosted (Context Match)
    // Tier 2: Non-Boosted (Shape Match)
    const tier1 = allMatches.filter(m => m.isBoosted);
    const tier2 = allMatches.filter(m => !m.isBoosted);

    tier1.sort((a, b) => b.score - a.score); // Best context matches
    tier2.sort((a, b) => b.score - a.score); // Best shape matches

    // Allow shape matches to override context ONLY if they are exceptionally good (> 0.85)
    // Otherwise, context wins.
    const exceptionalShapes = tier2.filter(m => m.score > 0.85);
    const normalShapes = tier2.filter(m => m.score <= 0.85);

    const finalRanking = [...exceptionalShapes, ...tier1, ...normalShapes];

    console.log('Analysis Debug:', {
      targetEmb: !!targetEmb,
      learnedCount: learned.length,
      rawMatches: allMatches.length,
      tier1: tier1.length,
      tier2: tier2.length,
      final: finalRanking.length
    });

    if (finalRanking.length === 0 && allMatches.length === 0) {
      console.warn('No matches found > 0.15 similarity.');
    }

    return finalRanking.slice(0, 5);
  };

  const analyzePokemon = async (imageData) => {
    setIsAnalyzing(true);
    setAnalysisStatus('Starting...');
    setTopCandidates([]);
    setAiDescription(null);
    setDetectedColor(null);
    setBoostedTypes([]);
    setShowManualSearch(false);
    setCurrentEmbedding(null);
    setCurrentDHash(null);
    try {
      const topMatches = await findPossibleMatches(imageData);
      setTopCandidates(topMatches);
      setIsAnalyzing(false);
      setAnalysisStatus('');
      if (topMatches.length > 0 && topMatches[0].isLearned) {
        const msg = topMatches[0].source === 'global' ? `Global Consensus: It's ${topMatches[0].pokemon.name}!` : `I remember this! It's ${topMatches[0].pokemon.name}.`;
        toast.success(msg);
      } else if (topMatches.length > 0 && topMatches[0].score > 0.60) {
        toast.success(`Found ${topMatches[0].pokemon.name}!`);
      } else if (topMatches.length === 0) {
        toast.error("No matches found. Try a clearer photo.");
      } else {
        toast.info("Select the best match from the list.");
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      setIsAnalyzing(false);
      setAnalysisStatus('');
      toast.error('Failed to analyze image.');
    }
  };

  const learnFromCorrection = async (pokemon) => {
    if (currentEmbedding) await saveFeedbackToDB(currentEmbedding, pokemon.id);
    if (currentDHash) saveGlobalFeedback(currentDHash, pokemon.id);
    toast.success(`Learned! Added ${pokemon.name} to the Global Brain.`);
    onPokemonFound(pokemon);
    handleClose();
  };

  const handleManualSelect = (candidate) => { learnFromCorrection(candidate.pokemon); };
  const filteredPokemon = manualQuery ? pokemonList.filter(p => p.name.includes(manualQuery.toLowerCase())).slice(0, 10) : [];
  const handleClose = () => {
    stopCamera(); setIsOpen(false); setSelectedImage(null); setCroppedImage(null);
    setTopCandidates([]); setAiDescription(null); setDetectedColor(null); setBoostedTypes([]);
    setIsAnalyzing(false); setIsCameraStarting(false); setAnalysisStatus(''); setShowManualSearch(false);
  };
  const handleOpenChange = (open) => { if (!open) handleClose(); else setIsOpen(true); };

  return (
    <>
      <Button variant="outline" size="icon" className="h-14 w-14 rounded-2xl border-2 hover:bg-accent/10 hover:border-accent" onClick={() => setIsOpen(true)}>
        <Camera className="h-5 w-5" />
      </Button>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-2xl">Search by Image</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {!isCameraMode && !selectedImage && (
              <div className="flex flex-col gap-3">
                <Button variant="outline" className="h-20 text-base" onClick={startCamera}>
                  <Camera className="mr-2 h-5 w-5" />{isCameraStarting ? 'Starting camera...' : 'Take Photo'}
                </Button>
                <Button variant="outline" className="h-20 text-base" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="mr-2 h-5 w-5" />Upload Image
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              </div>
            )}
            {isCameraMode && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  {isCameraStarting && <div className="absolute inset-0 flex items-center justify-center bg-background/70"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1"><Camera className="mr-2 h-4 w-4" />Capture</Button>
                  <Button variant="outline" onClick={stopCamera}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
            {selectedImage && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border">
                    <img src={selectedImage} alt="Original" className="w-full h-full object-contain" />
                    <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[10px] px-1 rounded">Original</span>
                  </div>
                  <div className="relative aspect-square bg-muted rounded-lg overflow-hidden border">
                    {croppedImage ? <img src={croppedImage} alt="Cropped" className="w-full h-full object-contain" /> : <div className="flex items-center justify-center h-full text-muted-foreground text-xs">{isAnalyzing ? 'Locating...' : 'Ready to analyze'}</div>}
                    <span className="absolute bottom-1 left-1 bg-primary/70 text-white text-[10px] px-1 rounded">AI View</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => analyzePokemon(selectedImage)} className="flex-1" disabled={isAnalyzing}>
                    {isAnalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><ScanEye className="mr-2 h-4 w-4" />Analyze</>}
                  </Button>
                  <Button variant="outline" onClick={() => { setSelectedImage(null); setCroppedImage(null); setIsCameraMode(false); }}>Clear</Button>
                </div>
                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-base font-semibold">{analysisStatus || 'Analyzing...'}</span>
                    {boostedTypes.length > 0 && <span className="text-xs text-green-600 animate-pulse">Scanning for {boostedTypes.join('/')} types...</span>}
                  </div>
                )}
                {!isAnalyzing && (aiDescription || topCandidates.length > 0) && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {aiDescription && (
                      <div className="flex flex-col gap-1 bg-muted/50 p-3 rounded-md text-sm">
                        <div><span className="font-semibold text-foreground">AI sees:</span> <span className="text-muted-foreground">{aiDescription}</span></div>
                        {detectedColor && <div className="flex items-center gap-1"><Palette className="w-3 h-3 text-muted-foreground" /><span className="text-muted-foreground">Color: <span className="capitalize">{detectedColor}</span></span></div>}
                        {boostedTypes.length > 0 && <div className="text-xs flex items-center gap-1 text-green-600 font-medium mt-1"><Zap className="w-3 h-3" />Context Boost: Prioritizing {boostedTypes.slice(0, 5).join(', ')}...</div>}
                      </div>
                    )}
                    {topCandidates.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /><span>Top Matches</span></h3>
                        <ScrollArea className="h-[220px] rounded-md border p-2">
                          <div className="space-y-2">
                            {topCandidates.map((c, idx) => (
                              <button key={c.pokemon.id} onClick={() => handleManualSelect(c)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors border bg-card text-left group">
                                <div className="relative w-12 h-12 bg-muted rounded-md overflow-hidden shrink-0"><img src={c.pokemon.sprites?.front_default} alt={c.pokemon.name} className="w-full h-full object-contain" /></div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between"><span className="font-semibold capitalize truncate">{c.pokemon.name}</span><Badge variant={idx === 0 ? "default" : "secondary"} className="text-[10px] h-5">{(c.score * 100).toFixed(0)}%</Badge></div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <span>{c.gen}</span>
                                    {c.isLearned && <span className={`flex items-center gap-0.5 font-bold ${c.source === 'global' ? 'text-blue-600' : 'text-purple-600'}`}>{c.source === 'global' ? <Globe className="w-3 h-3" /> : <Save className="w-3 h-3" />}{c.source === 'global' ? ' Global' : ' Local'} Match</span>}
                                    {c.isBoosted && !c.isLearned && <span className="text-green-600 flex items-center gap-0.5" title="Matches context type"><Zap className="w-3 h-3" /> Boosted</span>}
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                    {topCandidates.length > 0 && !showManualSearch && <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowManualSearch(true)}><Search className="w-4 h-4 mr-2" />None of these? Teach AI</Button>}
                    {showManualSearch && (
                      <div className="space-y-2 p-3 bg-muted/30 border rounded-lg animate-in slide-in-from-bottom-2">
                        <h4 className="text-sm font-semibold">Teach the AI</h4>
                        <Input placeholder="Type Pokemon name..." value={manualQuery} onChange={(e) => setManualQuery(e.target.value)} autoFocus />
                        {manualQuery.length > 1 && (
                          <div className="max-h-[150px] overflow-y-auto space-y-1 mt-2">
                            {filteredPokemon.map(p => (
                              <button key={p.id} onClick={() => learnFromCorrection(p)} className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded flex items-center gap-2">
                                <img src={p.sprites?.front_default} className="w-6 h-6" /><span className="capitalize">{p.name}</span>
                              </button>
                            ))}
                            {filteredPokemon.length === 0 && <div className="text-xs text-muted-foreground p-2">No matches found</div>}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageSearch;
