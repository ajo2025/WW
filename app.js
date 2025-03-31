import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://hqtnfgsckmnezsxtuykj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxdG5mZ3Nja21uZXpzeHR1eWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNzY4MzAsImV4cCI6MjA1ODk1MjgzMH0.ez66wX-wV0A0XKkx3zZhGxE_YzP45ufBvMr4f29DinY';
const supabase = createClient(supabaseUrl, supabaseKey);

const uploadForm = document.getElementById('upload-form');
const imageInput = document.getElementById('image-input');
const statusDiv = document.getElementById('status');
const imageGallery = document.getElementById('image-gallery');

// Función para redimensionar y comprimir imágenes
async function resizeImage(file, maxWidth = 800, maxHeight = 800) {
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.7); // WebP con 70% calidad
            };
        };
        reader.readAsDataURL(file);
    });
}

// Función para subir la imagen
async function uploadImage(file) {
    try {
        const resizedFile = await resizeImage(file, 800, 800);
        const fileName = `${Date.now()}.webp`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, resizedFile, {
                cacheControl: '31536000',
                upsert: false,
                contentType: 'image/webp',
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (error) {
        throw new Error(`Error al subir la imagen: ${error.message}`);
    }
}

// Función para mostrar vista previa local antes de subir
function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target.result;
        img.style.maxWidth = '150px';
        img.classList.add('preview');
        imageGallery.prepend(img); // Añade la vista previa al inicio
    };
    reader.readAsDataURL(file);
}

// Función para cargar imágenes desde Supabase
async function loadImages(limit = 10, offset = 0) {
    try {
        const { data: files, error: listError } = await supabase.storage
            .from('images')
            .list('public', {
                limit: limit,
                offset: offset,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (listError) {
            throw listError;
        }

        for (const file of files) {
            const filePath = `public/${file.name}`;
            const { data: publicUrlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            const img = document.createElement('img');
            img.src = publicUrlData.publicUrl;
            img.alt = file.name;
            img.loading = 'lazy';
            img.style.maxWidth = '150px';
            imageGallery.appendChild(img);
        }
    } catch (error) {
        statusDiv.textContent = `Error al cargar las imágenes: ${error.message}`;
    }
}

// Manejar el evento de selección de archivo
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        showPreview(file); // Mostrar vista previa inmediatamente
        statusDiv.textContent = 'Imagen seleccionada, subiendo...';
        uploadForm.dispatchEvent(new Event('submit')); // Disparar el envío automático
    }
});

// Manejar el envío del formulario
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = imageInput.files[0];
    if (!file) {
        statusDiv.textContent = 'Por favor, selecciona una imagen.';
        return;
    }

    try {
        const url = await uploadImage(file);
        statusDiv.textContent = '¡Imagen subida con éxito!';
        imageInput.value = ''; // Limpiar el input
        const preview = document.querySelector('.preview');
        if (preview) preview.remove(); // Eliminar la vista previa
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '150px';
        img.loading = 'lazy';
        imageGallery.prepend(img); // Añadir la imagen subida
    } catch (error) {
        statusDiv.textContent = error.message;
    }
});

// Cargar imágenes al iniciar
document.addEventListener('DOMContentLoaded', () => loadImages(10, 0));