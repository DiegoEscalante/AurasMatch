import cv2
import mediapipe as mp
import numpy as np

mp_face_mesh = mp.solutions.face_mesh

def extract_facial_regions(image_bytes: bytes):
    """Processes an image to extract eye and lip coordinates."""
    # Convert bytes to numpy array for OpenCV
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # MediaPipe requires RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w, _ = img.shape
    
    with mp_face_mesh.FaceMesh(
        static_image_mode=True, 
        max_num_faces=1, 
        refine_landmarks=True, 
        min_detection_confidence=0.5
    ) as face_mesh:
        results = face_mesh.process(img_rgb)
        
        if not results.multi_face_landmarks:
            raise ValueError("No face detected in the image.")
            
        landmarks = results.multi_face_landmarks[0]
        
        # You will map the specific lip/eye coordinate indices here
        # calculate bounding boxes, crop the img array, and return the cropped images
        
        return {"status": "success"}