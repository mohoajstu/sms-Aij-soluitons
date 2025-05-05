/**
 * avatarService.js
 * Utility for generating SVG avatars with randomized colors
 */

// Generate a random color in the HSL color space
const getRandomColor = (seed) => {
  // Use seed for consistent colors for same students
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Generate a hue value between 0 and 360 using the hash
  const hue = hash % 360;
  
  // Keep saturation and lightness in ranges that produce nice colors
  const saturation = 65 + (hash % 20); // 65-85%
  const lightness = 45 + (hash % 15);  // 45-60%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Get initials from a name (up to 2 characters)
const getInitials = (name) => {
  if (!name) return '?';
  
  return name
    .split(' ')
    .filter(part => part.length > 0)
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

// Generate an SVG avatar with the person's initials and a random background color
const generateSvgAvatar = (name, size = 40) => {
  const backgroundColor = getRandomColor(name);
  const initials = getInitials(name);
  
  // Create the SVG as a data URL
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="${size}" height="${size}" fill="${backgroundColor}" rx="${size/4}" />
      <text 
        x="50%" 
        y="50%" 
        dy=".1em" 
        fill="white" 
        font-family="Arial, sans-serif" 
        font-size="${size/2}px" 
        font-weight="bold" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${initials}
      </text>
    </svg>
  `;
  
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export default {
  generateSvgAvatar,
  getRandomColor,
  getInitials
}; 