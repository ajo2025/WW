import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Inicializa el cliente de Supabase
const supabaseUrl = 'https://hqtnfgsckmnezsxtuykj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxdG5mZ3Nja21uZXpzeHR1eWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNzY4MzAsImV4cCI6MjA1ODk1MjgzMH0.ez66wX-wV0A0XKkx3zZhGxE_YzP45ufBvMr4f29DinY';
const supabase = createClient(supabaseUrl, supabaseKey);

// Referencias a los elementos del DOM
const uploadForm = document.getElementById('upload-form');
const imageInput = document.getElementById('image-input');
const statusDiv = document.getElementById('status');
const imageGallery = document.getElementById('image-gallery');

// Función para subir una imagen
async function uploadImage(file) {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`; // Carpeta "public" dentro del bucket

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
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

// Función para cargar y mostrar las imágenes subidas
async function loadImages() {
    try {
        const { data: files, error: listError } = await supabase.storage
            .from('images')
            .list('public', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' },
            });

        if (listError) {
            throw listError;
        }

        imageGallery.innerHTML = ''; // Limpia la galería

        for (const file of files) {
            const filePath = `public/${file.name}`;
            const { data: publicUrlData } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            const img = document.createElement('img');
            img.src = publicUrlData.publicUrl;
            img.alt = file.name;
            imageGallery.appendChild(img);
        }
    } catch (error) {
        statusDiv.textContent = `Error al cargar las imágenes: ${error.message}`;
    }
}

// Maneja el evento de envío del formulario
uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const file = imageInput.files[0];
    if (!file) {
        statusDiv.textContent = 'Por favor, selecciona una imagen.';
        return;
    }

    statusDiv.textContent = 'Subiendo imagen...';

    try {
        await uploadImage(file);
        statusDiv.textContent = '¡Imagen subida con éxito!';
        imageInput.value = ''; // Limpia el input
        await loadImages(); // Recarga las imágenes
    } catch (error) {
        statusDiv.textContent = error.message;
    }
});

// Carga las imágenes al iniciar la página
document.addEventListener('DOMContentLoaded', loadImages);