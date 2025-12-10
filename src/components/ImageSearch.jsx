import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export const ImageSearch = ({ onPokemonFound }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
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
        analyzePokemon(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraMode(true);
      }
    } catch (error) {
      toast.error('Não foi possível acessar a câmera');
      console.error('Camera error:', error);
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
      analyzePokemon(imageData);
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
    
    // Simular análise de imagem
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Análise baseada em cores dominantes (mock)
    const dominantColor = await getDominantColor(imageData);
    const pokemonMatch = matchPokemonByColor(dominantColor);
    
    setIsAnalyzing(false);
    
    if (pokemonMatch) {
      toast.success(`Pokémon encontrado: ${pokemonMatch.name}!`);
      onPokemonFound(pokemonMatch);
      handleClose();
    } else {
      toast.error('Nenhum Pokémon reconhecido. Tente outra imagem.');
    }
  };

  const getDominantColor = (imageData) => {
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
        
        let r = 0, g = 0, b = 0;
        const pixelCount = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
        }
        
        r = Math.floor(r / pixelCount);
        g = Math.floor(g / pixelCount);
        b = Math.floor(b / pixelCount);
        
        resolve({ r, g, b });
      };
      img.src = imageData;
    });
  };

  const matchPokemonByColor = (color) => {
    // Mapear cores dominantes para Pokémon específicos
    const { r, g, b } = color;
    
    // Vermelho/Laranja - Fire types
    if (r > 150 && r > g && r > b) {
      return { id: 4, name: 'Charmander' };
    }
    // Azul - Water types
    if (b > 150 && b > r && b > g) {
      return { id: 7, name: 'Squirtle' };
    }
    // Verde - Grass types
    if (g > 150 && g > r && g > b) {
      return { id: 1, name: 'Bulbasaur' };
    }
    // Amarelo - Electric types
    if (r > 200 && g > 200 && b < 100) {
      return { id: 25, name: 'Pikachu' };
    }
    // Rosa/Roxo
    if (r > 150 && b > 150 && g < 150) {
      return { id: 35, name: 'Clefairy' };
    }
    // Marrom
    if (r > 100 && g > 70 && b > 50 && r > b) {
      return { id: 50, name: 'Diglett' };
    }
    
    // Pokémon aleatório se não encontrar match
    const randomIds = [1, 4, 7, 25, 35, 133, 151];
    const randomId = randomIds[Math.floor(Math.random() * randomIds.length)];
    const names = ['Bulbasaur', 'Charmander', 'Squirtle', 'Pikachu', 'Clefairy', 'Eevee', 'Mew'];
    return { id: randomId, name: names[randomIds.indexOf(randomId)] };
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setSelectedImage(null);
    setIsAnalyzing(false);
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

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl">Buscar por Imagem</DialogTitle>
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
                  Tirar Foto
                </Button>
                
                <Button
                  variant="outline"
                  className="h-20 text-base"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Enviar Imagem
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
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1">
                    <Camera className="mr-2 h-4 w-4" />
                    Capturar
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
                
                {isAnalyzing && (
                  <div className="flex items-center justify-center gap-2 py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-base font-semibold">Analisando imagem...</span>
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
