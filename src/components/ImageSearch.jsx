import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const ImageSearch = ({ onPokemonFound, pokemonList = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const modelRef = useRef(null);
  const tfRef = useRef(null);
  const referenceEmbeddingsRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    setIsCameraStarting(true);
    try {
      setIsCameraMode(true);
      setSelectedImage(null);
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
        const onReady = () => {
          videoRef.current?.play().catch(() => {});
        };
        if (videoRef.current.readyState >= 2) {
          onReady();
        } else {
          videoRef.current.onloadedmetadata = onReady;
        }
      };
      // Run after render to ensure video element exists
      requestAnimationFrame(attachStream);
    } catch (error) {
      toast.error('Could not access the camera. Please allow camera permissions.');
      console.error('Camera error:', error);
    } finally {
      setIsCameraStarting(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      setSelectedImage(imageData);
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

  const analyzePokemon = async (imageData) => {
    setIsAnalyzing(true);

    try {
      const features = await extractImageFeatures(imageData);
      const nnMatch = await findNearestPokemon(imageData);
      const visionGuess = await classifyWithMobilenet(imageData);
      const mappedVision = mapVisionToPokemon(visionGuess);
      const pokemonMatch = nnMatch ?? mappedVision ?? matchPokemonByFeatures(features, visionGuess);
      setIsAnalyzing(false);

      if (pokemonMatch) {
        toast.success(`Pokemon found: ${pokemonMatch.name}!`);
        onPokemonFound(pokemonMatch);
        handleClose();
      } else {
        toast.error('No Pokemon recognized. Try another image.');
      }
    } catch (err) {
      console.error('Image analysis error:', err);
      setIsAnalyzing(false);
      toast.error('Failed to analyze image. Try again.');
    }
  };

  const extractImageFeatures = (imageData) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageDataObj = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageDataObj.data;

        let r = 0, g = 0, b = 0, brightness = 0;
        const pixelCount = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i];
          const pg = data[i + 1];
          const pb = data[i + 2];
          r += pr;
          g += pg;
          b += pb;
          brightness += (pr + pg + pb) / 3;
        }

        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);
        brightness = Math.floor(brightness / pixelCount);

        const hue = rgbToHue(r, g, b);
        const aspect = img.width / img.height;

        resolve({ r, g, b, brightness, hue, aspect });
      };
      img.src = imageData;
    });
  };

  const rgbToHue = (r, g, b) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d === 0) h = 0;
    else if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
    return h;
  };

  const matchPokemonByFeatures = (features, visionGuess) => {
    const { r, g, b, hue, brightness, aspect } = features;

    // Quick special cases to cut common mislabels
    const isPurpleGhost = hue >= 245 && hue <= 295 && brightness <= 80;
    if (isPurpleGhost) {
      return { id: 94, name: 'Gengar' };
    }
    const isBlueLapras =
      hue >= 185 &&
      hue <= 235 &&
      brightness >= 55 &&
      b > r + 15 &&
      b > g + 10 &&
      aspect >= 0.7 &&
      aspect <= 1.25;
    if (isBlueLapras) {
      return { id: 131, name: 'Lapras' };
    }

    const candidates = [
      { id: 25, name: 'Pikachu', hues: [50, 70], minBrightness: 80, tag: 'electric' },
      { id: 4, name: 'Charmander', hues: [10, 40], minBrightness: 50, tag: 'fire' },
      { id: 6, name: 'Charizard', hues: [10, 35], minBrightness: 60, tag: 'fire' },
      { id: 7, name: 'Squirtle', hues: [180, 240], minBrightness: 50, tag: 'water' },
      { id: 134, name: 'Vaporeon', hues: [180, 230], minBrightness: 55, tag: 'water' },
      { id: 1, name: 'Bulbasaur', hues: [90, 150], minBrightness: 45, tag: 'grass' },
      { id: 3, name: 'Venusaur', hues: [90, 150], minBrightness: 45, tag: 'grass' },
      { id: 35, name: 'Clefairy', hues: [300, 340], minBrightness: 60, tag: 'fairy' },
      { id: 143, name: 'Snorlax', hues: [180, 250], minBrightness: 15, maxBrightness: 55, tag: 'normal' },
      { id: 94, name: 'Gengar', hues: [250, 300], minBrightness: 25, tag: 'ghost' },
      { id: 248, name: 'Tyranitar', hues: [70, 140], minBrightness: 30, tag: 'rock' },
      { id: 448, name: 'Lucario', hues: [190, 230], minBrightness: 40, tag: 'fighting' },
      { id: 131, name: 'Lapras', hues: [185, 235], minBrightness: 55, tag: 'water' },
      { id: 150, name: 'Mewtwo', hues: [280, 320], minBrightness: 50, tag: 'psychic' },
      { id: 151, name: 'Mew', hues: [330, 360], minBrightness: 70, tag: 'psychic' },
      { id: 52, name: 'Meowth', hues: [40, 70], minBrightness: 70, tag: 'normal' },
      { id: 92, name: 'Gastly', hues: [250, 300], minBrightness: 25, tag: 'ghost' },
    ];

    const scoreCandidate = (cand) => {
      const inHue =
        cand.hues &&
        ((cand.hues[0] <= cand.hues[1] && hue >= cand.hues[0] && hue <= cand.hues[1]) ||
          (cand.hues[0] > cand.hues[1] && (hue >= cand.hues[0] || hue <= cand.hues[1])));
      let score = 0;
      if (inHue) score += 3;
      if (!cand.minBrightness || brightness >= cand.minBrightness) score += 1;
      if (cand.maxBrightness && brightness <= cand.maxBrightness) score += 1;
      if (cand.tag === 'water' && b > r && b > g) score += 1;
      if (cand.tag === 'fire' && r > g && r > b) score += 1;
      if (cand.tag === 'grass' && g > r && g > b) score += 1;
      if (cand.tag === 'electric' && r > 200 && g > 200 && b < 140) score += 1;
      if (cand.tag === 'normal' && Math.abs(r - g) < 30 && Math.abs(g - b) < 30) score += 1;
      if (aspect > 1.2 && (cand.name === 'Charizard' || cand.name === 'Tyranitar')) score += 1;
      if (visionGuess && cand.name.toLowerCase().includes(visionGuess.label)) score += 5;
      if (visionGuess && cand.tag && visionGuess.label.includes(cand.tag)) score += 3;
      return score;
    };

    let best = null;
    let bestScore = 0;
    candidates.forEach((cand) => {
      const score = scoreCandidate(cand);
      if (score > bestScore) {
        best = cand;
        bestScore = score;
      }
    });

    if (best && bestScore >= 3) return best;
    return null;
  };

  const ensureModel = async () => {
    if (modelRef.current && tfRef.current) return { model: modelRef.current, tf: tfRef.current };
    setModelLoading(true);
    const tf = await import('@tensorflow/tfjs');
    await tf.ready();
    const mobilenet = await import('@tensorflow-models/mobilenet');
      const model = await mobilenet.load({ version: 2, alpha: 1.0 });
    modelRef.current = model;
    tfRef.current = tf;
    setModelLoading(false);
    return { model, tf };
  };

  const loadImageElement = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const computeEmbedding = async (src) => {
    const { model, tf } = await ensureModel();
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
  };

  const cosineSim = (a, b) => {
    if (!a || !b || a.length !== b.length) return -1;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-6);
  };

  const buildReferenceEmbeddings = async () => {
    if (referenceEmbeddingsRef.current) return referenceEmbeddingsRef.current;
    if (!pokemonList.length) return null;
    const { model } = await ensureModel();
    setModelLoading(true);
    const refs = [];
    const maxRefs = 400; // keep runtime reasonable but broad
    for (let i = 0; i < Math.min(maxRefs, pokemonList.length); i++) {
      const p = pokemonList[i];
      const sprite = p?.sprites?.other?.['official-artwork']?.front_default || p?.sprites?.front_default;
      if (!sprite) continue;
      try {
        const emb = await computeEmbedding(sprite);
        refs.push({ id: p.id, name: p.name, emb });
      } catch (err) {
        console.error('Failed embedding sprite', p.id, err);
      }
    }
    referenceEmbeddingsRef.current = refs;
    setModelLoading(false);
    return refs;
  };

  const findNearestPokemon = async (imageData) => {
    try {
      const refs = await buildReferenceEmbeddings();
      if (!refs || refs.length === 0) return null;
      const targetEmb = await computeEmbedding(imageData);
      let best = null;
      let bestSim = -1;
      refs.forEach((ref) => {
        const sim = cosineSim(targetEmb, ref.emb);
        if (sim > bestSim) {
          bestSim = sim;
          best = ref;
        }
      });
      if (best && bestSim >= 0.7) return { id: best.id, name: best.name };
      return bestSim > 0.5 ? { id: best.id, name: best.name } : null;
    } catch (err) {
      console.error('Nearest neighbor match failed', err);
      return null;
    }
  };

  const classifyWithMobilenet = async (imageData) => {
    try {
      const { model } = await ensureModel();
      const img = await loadImageElement(imageData);
      const results = await model.classify(img);
      if (!results || !results.length) return null;
      const top = results[0];
      return { label: top.className.toLowerCase(), prob: top.probability };
    } catch (err) {
      console.error('Mobilenet classify failed', err);
      return null;
    }
  };

  const mapVisionToPokemon = (visionGuess) => {
    if (!visionGuess || !visionGuess.label || !pokemonList.length) return null;
    const label = visionGuess.label.toLowerCase();
    // direct name match
    const direct = pokemonList.find((p) => p.name.toLowerCase() === label);
    if (direct) return { id: direct.id, name: direct.name };
    // substring match
    const partial = pokemonList.find((p) => label.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(label));
    if (partial) return { id: partial.id, name: partial.name };
    // loose match by splitting label words
    const words = label.split(/[^a-z0-9]+/).filter(Boolean);
    for (const w of words) {
      if (w.length < 3) continue;
      const found = pokemonList.find((p) => p.name.toLowerCase().includes(w));
      if (found) return { id: found.id, name: found.name };
    }
    return null;
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setSelectedImage(null);
    setIsAnalyzing(false);
    setIsCameraStarting(false);
  };

  const handleOpenChange = (open) => {
    if (!open) {
      handleClose();
    } else {
      setIsOpen(true);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="h-14 w-14 rounded-2xl border-2 hover:bg-accent/10 hover:border-accent"
        onClick={() => setIsOpen(true)}
      >
        <Camera className="h-5 w-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Search by Image</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {!isCameraMode && !selectedImage && (
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="h-20 text-base"
                  onClick={startCamera}
                  >
                  <Camera className="mr-2 h-5 w-5" />
                  {isCameraStarting ? 'Starting camera...' : 'Take Photo'}
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 text-base"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Image
                </Button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            )}
            
            {isCameraMode && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {isCameraStarting && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />
                    Capture
                  </Button>
                  <Button variant="outline" onClick={stopCamera}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            
            {selectedImage && (
              <div className="space-y-4">
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => analyzePokemon(selectedImage)} className="flex-1" disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Analyze image
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => { setSelectedImage(null); setIsCameraMode(false); }}>
                    Clear
                  </Button>
                </div>
                
                {isAnalyzing && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-base font-semibold">Analyzing image...</span>
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
