const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const imageCompressionSettings = { width: 500, height: 500, quality: 50, lossless: false, fit: 'cover' };
const folderNames = [
    "Chamcham",
    "Chhena Chap",
    "Chhena Phool",
    "Chhena Roll",
    "Chhena Sandwich",
    "Kala Jamun",
    "Kheer Kadam",
    "Kheer Mohan",
    "Malai Rasmadhuri",
    "Manchali",
    "Rasmadhuri",
    "Chhena Cup",
    "Chhena Roll",
    "Gulab Jamun",
    "Gulab Rasgulla",
    "Keshar Bhog",
    "Orange Rasgulla",
    "Rabdi Ras Malai",
    "Raj Bhog",
    "Ras Malai",
    "Rasgulla",
    "Alsi Laddoo",
    "Balu Shahi",
    "Bari Bundi",
    "Battisha",
    "Besan Laddoo",
    "Bundi Laddoo",
    "Chana Bite",
    "Chana Mewa Laddoo",
    "Chandra Kala",
    "Coconut Laddoo",
    "Feni",
    "Ghevar Malai",
    "Ghevar Sada",
    "Gond Laddoo",
    "Hara Mewa Laddoo",
    "Imarti",
    "Irani Laddoo",
    "Jodhpuri Laddoo",
    "Khurma",
    "Lachha Sohan Papdi",
    "Laung Latta",
    "Magdal",
    "Maysore Pak",
    "Mini Gujhiya",
    "Moong Mewa Laddoo",
    "Navratan Gujhiya",
    "Navratan Laddoo",
    "Pinni",
    "Rasili Potli",
    "Sadi Gujhiya",
    "Sohan Halwa Mawa",
    "Sohan Roll",
    "Sonth Laddoo",
    "Sugar Free Gujhiya",
    "Tirangi Gujhiya",
    "Akhrot",
    "Anjeer",
    "Badam",
    "Chuara",
    "Kaju",
    "Kismis",
    "Makhana",
    "Nariyal Gola",
    "Pista Salted",
    "Special Mewa Pack",
    "Chocolate Gajak",
    "Gajak Biscuit",
    "Gajak Cone",
    "Gajak Gujhiya",
    "Gajak Roll",
    "Moongfali Chikki",
    "Orange Gajak",
    "Til Barfi",
    "Til Chikki",
    "Til Gajak",
    "Til Laddoo",
    "Tilbugga",
    "Badam Halwa",
    "Gajar Halwa",
    "Moong Halwa",
    "Badam Milk Shake",
    "Keshariya Kulfi",
    "Keshariya Kulfi Pack",
    "Rabdi Kulfi",
    "Rabdi Kulfi Pack",
    "Akhrot Barfi",
    "Anjeer Roll",
    "Anjeer Gilori",
    "Anjeer Gujhiya",
    "Badam Barfi",
    "Badshah Basant",
    "Fruit Laddoo",
    "Gulab Chikki",
    "Gulab Mewa Laddoo",
    "Kaju Anjeer Barfi",
    "Kaju Barfi",
    "Kaju Biscuit",
    "Kaju Choclate Laddoo",
    "Kaju Chocolate Bite",
    "Kaju Diamond",
    "Kaju Diya",
    "Kaju Gujhiya",
    "Kaju Gulkand",
    "Kaju Jalebi",
    "Kaju Kadam",
    "Kaju Kalash",
    "Kaju Kamal",
    "Kaju Keshar",
    "Kaju Keshar Pista Barfi",
    "Kaju Khaskhas",
    "Kaju Lemon",
    "Kaju Mango",
    "Kaju Mewa Bite",
    "Kaju Navrang",
    "Kaju Orange Sohan Halwa",
    "Kaju Phool",
    "Kaju Rose",
    "Kaju Samosa",
    "Kaju Sohan Halwa",
    "Kaju Star",
    "Kaju Sunflower",
    "Kaju Tirangi Barfi",
    "Khajur Laddoo",
    "Malai Cake",
    "Malai Fruiti",
    "Malai Gilori",
    "Malai Sandwich",
    "Mewa Chikki",
    "Pista Badshah Basant",
    "Pista Barfi",
    "Pista Cone",
    "Pista Gillori",
    "Pista Roll",
    "Pizzi Barfi",
    "Badam Bahar Barfi",
    "Basant Bahar",
    "Chocolate Barfi",
    "Dil Bahar Barfi",
    "Dil Khush Barfi",
    "Doda Barfi",
    "Dudhiya Barfi",
    "Elaichi Peda",
    "Kalakand",
    "Karachi Halwa",
    "Karam Shahi Barfi",
    "Keshar Peda",
    "Khowa Cutlet",
    "Khowa Gilori",
    "Khowa Kadam",
    "Khowa Khinni",
    "Khowa Mewa Laddoo",
    "Khowa Parwal",
    "Khowa Plain Barfi",
    "Khowa Roll",
    "Lal Peda",
    "Lauki Mewa Laddoo",
    "Madhumati",
    "Malai Barfi",
    "Malpua",
    "Mathura Peda",
    "Milk Cake",
    "Milk Pudding",
    "Moti Pag Barfi",
    "Nariyal Barfi",
    "Punjab Bahar",
    "Radhapriya Barfi",
    "Raj Bahar",
    "Safed Peda",
    "Sandesh Barfi",
    "Sheesh Bahar",
    "Tirangi Barfi",
    "Chhena Mix",
    "Chikki Mix",
    "Kaju Mix",
    "Khowa Mix",
    "Achari Mathri",
    "Chiwda Namkeen",
    "Hari Namkeen",
    "Kaju Masala",
    "Kaju Salted",
    "Karela Namkeen",
    "Khasta",
    "Lachha Badam Namkeen",
    "Makhan Bari",
    "Masoor Namkeen",
    "Matri Namkeen",
    "Mewa Falahari Namkeen",
    "Namakpara",
    "Namkeen Bhujiya",
    "Navratan Namkeen",
    "Samosi Namkeen",
    "Sem Beej",
    "Sohal",
    "Angoori Petha",
    "Parwal",
    "Petha",
    "Petha Gareri",
    "Petha Gilori",
    "Petha Roll",
    "Santra Barfi",
    "1 Pcs Laddu Special Box",
    "2 Pcs Laddu Special Box",
    "3 Pcs Laddu Special Box",
    "4 Pcs Laddu Special Box",
    "Khaja",
    "Meetha Math",
    "Namkeen Math",
    "Sada Math",
    "Basket Chaat",
    "Bhalla Papri",
    "Chhola Samosa",
    "Cutlet",
    "Dahi Bada",
    "Dahi Bhalla",
    "Dahi Tikki",
    "Half Dahi Bhalla",
    "Half Dahi Tikki",
    "Khasta Dam Aloo",
    "Matar Paneer Samosa",
    "Matar Tikki",
    "Palak Chaat",
    "Paneer Patties",
    "Papri Chaat",
    "Plain Dhokla",
    "Ragda Patties",
    "Raj Kachauri",
    "Samosa",
    "Sandwich Dhokla",
    "Sandwich Samosa",
    "Sonth Papdi Chaat",
    "Amawat Laddoo",
    "Chocolate Punjab Bahar",
    "Khowa Katori",
    "Kaju Badamkali",
    "Gathiya Sev",
    "Special Tasty Namkeen",
    "Moong Mewa Namkeen",
    "Falhari Namkeen",
    "Roasted Chiwda Namkeen",
    "Dal Biji Namkeen",
    "Heeng Papdi Namkeen",
    "Mixture Namkeen",
    "Palak Mathri",
    "Methi Mathri",
];

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('Please enter the operation number: \n1. Create folders \n2. Rename images \n3. Move files to folder \n4. Convert all the images to webp\n5. Change extensions to Lowercase\n', operation => {
    switch (operation) {
        case '1':
            createFolders();
            break;
        case '2':
            renameImages();
            break;
        case '3':
            moveFilesToFolder();
            break;
        case '4':
            convertAndCropImages(imageCompressionSettings);
            break;
        case '5':
            changeExtensionsToLowercase(__dirname);
            break;
        default:
            console.log('Invalid operation');
    }
    readline.close();
});

async function createFolders() {
    for (const folder of folderNames) {
        const folderPath = path.join(__dirname, folder);
        try {
            await fs.mkdir(folderPath, { recursive: true });
        } catch (err) {
            console.error(`Failed to create folder ${folder}: ${err}`);
        }
    }
}

async function renameImages() {
    for (const folder of folderNames) {
        const folderPath = path.join(__dirname, folder);
        try {
            const files = await fs.readdir(folderPath);
            let imageNumber = 1;
            for (const file of files) {
                const oldPath = path.join(folderPath, file);
                const extension = path.extname(oldPath);
                if (imageExtensions.includes(extension.toLowerCase())) {
                    const newPath = path.join(folderPath, `${imageNumber}${extension}`);
                    await fs.rename(oldPath, newPath);
                    imageNumber++;
                }
            }
        } catch (err) {
            console.error(`Failed to rename images in folder ${folder}: ${err}`);
        }
    }
}

async function moveFilesToFolder() {
    try {
        const files = await fs.readdir(__dirname);
        for (const file of files) {
            const filePath = path.join(__dirname, file);
            const stat = await fs.stat(filePath);
            if (stat.isFile()) {
                const extension = path.extname(filePath);
                if (imageExtensions.includes(extension.toLowerCase())) {
                    const folderPath = path.join(__dirname, path.basename(filePath, extension));
                    await fs.mkdir(folderPath, { recursive: true });
                    const newFilePath = path.join(folderPath, file);
                    await fs.rename(filePath, newFilePath);
                }
            }
        }
    } catch (err) {
        console.error(`Failed to move files to folder: ${err}`);
    }
}

const changeExtensionsToLowercase = async (dirPath) => {
    try {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
            const filePath = path.join(dirPath, file);
            const stat = await fs.stat(filePath);
            if (stat.isDirectory()) {
                await changeExtensionsToLowercase(filePath);
            } else {
                const extension = path.extname(filePath);
                if (imageExtensions.includes(extension.toLowerCase())) {
                    const newFilePath = path.join(dirPath, `${path.basename(file, extension)}${extension.toLowerCase()}`);
                    await fs.rename(filePath, newFilePath);
                }
            }
        }
    } catch (err) {
        console.error(`Failed to change extensions to lowercase: ${err}`);
    }
};

async function convertAndCropImages(settings) {
    for (const folder of folderNames) {
        const folderPath = path.join(__dirname, folder);
        try {
            const files = await fs.readdir(folderPath);
            console.log(`Processing ${files.length} files in folder ${folder}`);
            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const stat = await fs.stat(filePath);
                if (stat.isFile()) {
                    const extension = path.extname(filePath);
                    if (imageExtensions.includes(extension.toLowerCase())) {
                        const outputPath = path.join(folderPath, `${path.basename(file, extension)}.webp`);
                        console.log(`Converting and cropping file ${file}`);
                        await sharp(filePath)
                            .resize({ width: settings.width, height: settings.height, fit: settings.fit })
                            .webp({ quality: settings.quality, lossless: settings.lossless })
                            .toFile(outputPath);
                        console.log(`Finished converting and cropping file ${file}`);
                    }
                }
            }
            console.log(`Finished processing files in folder ${folder}`);
        } catch (err) {
            console.error(`Failed to convert and crop images in folder ${folder}: ${err}`);
        }
    }
}