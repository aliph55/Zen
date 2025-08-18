import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';

const DistilGPT2Chatbot = () => {
  const [session, setSession] = useState(null);
  const [vocab, setVocab] = useState(null);
  const [reverseVocab, setReverseVocab] = useState(null);
  const [config, setConfig] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const scrollViewRef = useRef(null);

  const loadModel = async () => {
    try {
      setIsLoading(true);
      console.log('Model yükleme başladı...');

      let modelPath, vocabPath, configPath;

      if (Platform.OS === 'android') {
        const documentDir = RNFS.DocumentDirectoryPath;
        modelPath = `${documentDir}/model.onnx`;
        vocabPath = `${documentDir}/vocab.json`;
        configPath = `${documentDir}/config.json`;

        console.log('Dosya yolları:', { modelPath, vocabPath, configPath });

        // Dosyaları kopyala
        const modelExists = await RNFS.exists(modelPath);
        console.log('Model dosyası var mı?', modelExists);

        if (!modelExists) {
          console.log('Model kopyalanıyor...');
          await RNFS.copyFileAssets('model.onnx', modelPath);
          console.log('Model kopyalandı');
        }

        const vocabExists = await RNFS.exists(vocabPath);
        console.log('Vocab dosyası var mı?', vocabExists);

        if (!vocabExists) {
          console.log('Vocab kopyalanıyor...');
          await RNFS.copyFileAssets('vocab.json', vocabPath);
          console.log('Vocab kopyalandı');
        }

        const configExists = await RNFS.exists(configPath);
        console.log('Config dosyası var mı?', configExists);

        if (!configExists) {
          console.log('Config kopyalanıyor...');
          await RNFS.copyFileAssets('config.json', configPath);
          console.log('Config kopyalandı');
        }

        // Dosya boyutlarını kontrol et
        const modelStat = await RNFS.stat(modelPath);
        const vocabStat = await RNFS.stat(vocabPath);
        const configStat = await RNFS.stat(configPath);

        console.log('Dosya boyutları:', {
          model: modelStat.size,
          vocab: vocabStat.size,
          config: configStat.size,
        });
      } else {
        // iOS için
        modelPath = RNFS.MainBundlePath + '/model.onnx';
        vocabPath = RNFS.MainBundlePath + '/vocab.json';
        configPath = RNFS.MainBundlePath + '/config.json';
      }

      // Model yükle
      console.log('ONNX modeli yükleniyor...');
      const sessionInstance = await InferenceSession.create(modelPath);
      setSession(sessionInstance);
      console.log('Model yüklendi');

      // Vocab yükle
      console.log('Vocab dosyasını okumaya başlıyor:', vocabPath);
      const vocabContent = await RNFS.readFile(vocabPath, 'utf8');
      console.log('Vocab dosyası okundu, boyut:', vocabContent.length);

      const vocabData = JSON.parse(vocabContent);
      setVocab(vocabData);

      // Reverse vocab oluştur (detokenize için)
      const reverseVocabData = {};
      for (const [token, id] of Object.entries(vocabData)) {
        reverseVocabData[id] = token;
      }
      setReverseVocab(reverseVocabData);

      console.log(
        'Vocab yüklendi, token sayısı:',
        Object.keys(vocabData).length,
      );

      // Config yükle
      console.log('Config dosyasını okumaya başlıyor:', configPath);
      const configContent = await RNFS.readFile(configPath, 'utf8');
      console.log('Config dosyası okundu, boyut:', configContent.length);

      const configData = JSON.parse(configContent);
      setConfig(configData);
      console.log('Config yüklendi:', Object.keys(configData));

      setModelLoaded(true);
      setIsLoading(false);
      console.log('Tüm model yükleme işlemi tamamlandı!');
    } catch (error) {
      console.error('Model yükleme hatası:', error);
      Alert.alert('Hata', 'Model yüklenemedi: ' + error.message);
      setIsLoading(false);
    }
  };

  // Modeli bileşen yüklendiğinde otomatik yükle
  useEffect(() => {
    loadModel();
  }, []);

  // Geliştirilmiş GPT-2 tokenizer
  const tokenize = text => {
    if (!vocab) return [];

    const tokens = [];
    let currentText = text;

    // Metni normalize et
    currentText = currentText.trim();

    // Basit bir yaklaşım: Kelime bazlı tokenizasyon
    // GPT-2 vocab'ta "Ġ" prefix'i boşluk anlamına gelir
    const words = currentText.split(' ');

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;

      // İlk kelime hariç diğerlerine Ġ prefix'i ekle
      let processedWord = i === 0 ? word : 'Ġ' + word;

      // Önce tam kelimeyi dene
      if (vocab[processedWord] !== undefined) {
        tokens.push(vocab[processedWord]);
        continue;
      }

      // Kelimeyi alt parçalara böl
      let remainingWord = processedWord;
      while (remainingWord.length > 0) {
        let found = false;

        // En uzun eşleşmeyi bul
        for (let len = remainingWord.length; len > 0; len--) {
          const subword = remainingWord.slice(0, len);
          if (vocab[subword] !== undefined) {
            tokens.push(vocab[subword]);
            remainingWord = remainingWord.slice(len);
            found = true;
            break;
          }
        }

        // Eğer hiç eşleşme bulunamazsa, karakterleri tek tek ekle
        if (!found) {
          const char = remainingWord[0];
          if (vocab[char] !== undefined) {
            tokens.push(vocab[char]);
          } else {
            // Unknown token
            tokens.push(vocab['<unk>'] || 0);
          }
          remainingWord = remainingWord.slice(1);
        }
      }
    }

    // Eğer boş sonuç çıkarsa
    if (tokens.length === 0) {
      tokens.push(vocab['<unk>'] || 0);
    }

    return tokens;
  };

  const generateResponse = async (inputText, onUpdate) => {
    if (!session || !vocab || !config) {
      Alert.alert('Hata', 'Model henüz yüklenmedi');
      return;
    }

    try {
      // Konuşma geçmişini al (son 3 mesaj çifti)
      const recentMessages = messages.slice(-6);
      let conversationContext = '';

      if (recentMessages.length > 0) {
        conversationContext =
          recentMessages
            .map(
              m => `${m.sender === 'user' ? 'Human' : 'Assistant'}: ${m.text}`,
            )
            .join('\n') + '\n';
      }

      // Geliştirilmiş prompt yapısı
      const systemPrompt =
        'The following is a conversation with a helpful AI assistant. The assistant provides clear, concise, and friendly responses.\n\n';

      // Tam prompt'u oluştur
      const fullPrompt =
        systemPrompt + conversationContext + `Human: ${inputText}\nAssistant:`;

      // Tokenize et ve token bütçesini kontrol et
      let inputTokens = tokenize(fullPrompt);

      // Token bütçesi kontrolü (DistilGPT-2 için max 1024)
      const maxContextLength = 900; // Yanıt için yer bırak
      if (inputTokens.length > maxContextLength) {
        // Çok uzunsa sadece son mesajı kullan
        const shortPrompt = `Human: ${inputText}\nAssistant:`;
        inputTokens = tokenize(shortPrompt);
        console.log('Context çok uzun, kısaltıldı');
      }
      console.log('Input tokens:', inputTokens);
      console.log('Input token count:', inputTokens.length);

      // Sequence generation
      const maxNewTokens = 80; // Daha uzun yanıtlar için artırıldı
      const minTokens = 5; // Minimum yanıt uzunluğu
      let allTokens = [...inputTokens];
      let pastKeyValues = null;

      // Repetition tracking
      const recentTokens = [];
      const repetitionWindow = 20; // Daha geniş pencere
      const repetitionPenalty = 1.3; // Daha güçlü ceza

      // N-gram tracking for repetition detection
      const ngramHistory = new Map();
      const ngramSize = 4; // 4-gram kullan

      // Sampling parametreleri - dinamik olarak ayarla
      let temperature = 0.85;
      let topK = 50;
      let topP = 0.92;

      let tokenStrings = [];

      for (let step = 0; step < maxNewTokens; step++) {
        const currentTokens = pastKeyValues
          ? [allTokens[allTokens.length - 1]]
          : allTokens;
        const sequenceLength = currentTokens.length;

        // Tensörleri hazırla
        const inputIds = new BigInt64Array(sequenceLength);
        const attentionMask = new BigInt64Array(allTokens.length);
        const positionIds = new BigInt64Array(sequenceLength);

        for (let i = 0; i < sequenceLength; i++) {
          inputIds[i] = BigInt(currentTokens[i] || 0);
          positionIds[i] = BigInt(allTokens.length - sequenceLength + i);
        }

        // Attention mask: 1 for all tokens seen so far
        for (let i = 0; i < allTokens.length; i++) {
          attentionMask[i] = BigInt(1);
        }

        const inputTensor = new Tensor('int64', inputIds, [1, sequenceLength]);
        const attentionTensor = new Tensor('int64', attentionMask, [
          1,
          allTokens.length,
        ]);
        const positionTensor = new Tensor('int64', positionIds, [
          1,
          sequenceLength,
        ]);

        // Past key values setup
        const feeds = {
          input_ids: inputTensor,
          attention_mask: attentionTensor,
          position_ids: positionTensor,
        };

        // Past key values ekle (eğer varsa)
        if (pastKeyValues) {
          for (let i = 0; i < 6; i++) {
            feeds[`past_key_values.${i}.key`] =
              pastKeyValues[`present.${i}.key`];
            feeds[`past_key_values.${i}.value`] =
              pastKeyValues[`present.${i}.value`];
          }
        } else {
          // İlk step için boş past key values
          for (let i = 0; i < 6; i++) {
            const emptyKey = new Float32Array(0);
            const emptyValue = new Float32Array(0);
            feeds[`past_key_values.${i}.key`] = new Tensor(
              'float32',
              emptyKey,
              [1, 12, 0, 64],
            );
            feeds[`past_key_values.${i}.value`] = new Tensor(
              'float32',
              emptyValue,
              [1, 12, 0, 64],
            );
          }
        }

        // Model çalıştır
        const results = await session.run(feeds);

        // Logits'i al
        const logits = results['logits'];
        const [batchSize, seqLen, vocabSize] = logits.dims;

        // Son token'ın logits'lerini al
        const lastTokenStartIndex = (seqLen - 1) * vocabSize;
        const lastTokenLogits = logits.data.slice(
          lastTokenStartIndex,
          lastTokenStartIndex + vocabSize,
        );

        // Apply repetition penalty - geliştirilmiş
        const penalizedLogits = Array.from(lastTokenLogits);

        // Recent tokens penalty
        for (let i = 0; i < recentTokens.length; i++) {
          const tokenId = recentTokens[i];
          const distancePenalty =
            1 + (repetitionPenalty - 1) * (1 - i / recentTokens.length);

          if (penalizedLogits[tokenId] !== undefined) {
            penalizedLogits[tokenId] =
              penalizedLogits[tokenId] < 0
                ? penalizedLogits[tokenId] * distancePenalty
                : penalizedLogits[tokenId] / distancePenalty;
          }
        }

        // Dinamik temperature adjustment
        if (step > 30) {
          temperature = Math.min(1.0, temperature + 0.02); // Zamanla daha yaratıcı
        }

        // Temperature sampling - dinamik
        const scaledLogits = penalizedLogits.map(logit => logit / temperature);

        // Top-k ve Top-p sampling kombinasyonu - dinamik parametreler
        const indexedLogits = scaledLogits.map((logit, index) => ({
          logit,
          index,
        }));
        indexedLogits.sort((a, b) => b.logit - a.logit);

        // Top-k filtering
        let topKLogits = indexedLogits.slice(0, topK);

        // Softmax
        const maxLogit = topKLogits[0].logit;
        const expLogits = topKLogits.map(item => ({
          ...item,
          prob: Math.exp(item.logit - maxLogit),
        }));

        const sumProbs = expLogits.reduce((sum, item) => sum + item.prob, 0);
        const normalizedProbs = expLogits.map(item => ({
          ...item,
          prob: item.prob / sumProbs,
        }));

        // Top-p filtering
        normalizedProbs.sort((a, b) => b.prob - a.prob);
        let cumulativeProb = 0;
        const topPFiltered = [];

        for (const item of normalizedProbs) {
          cumulativeProb += item.prob;
          topPFiltered.push(item);
          if (cumulativeProb >= topP) break;
        }

        // Sampling
        const randomValue = Math.random();
        cumulativeProb = 0;
        let selectedTokenId = topPFiltered[0].index;

        for (const item of topPFiltered) {
          cumulativeProb += item.prob;
          if (randomValue <= cumulativeProb) {
            selectedTokenId = item.index;
            break;
          }
        }

        // Check for n-gram repetition - geliştirilmiş
        if (allTokens.length >= ngramSize) {
          // 4-gram kontrolü
          const ngram4 = allTokens.slice(-ngramSize).join(',');
          const count4 = ngramHistory.get(ngram4) || 0;
          ngramHistory.set(ngram4, count4 + 1);

          // 3-gram kontrolü de yap
          const ngram3 = allTokens.slice(-3).join(',');
          const count3 = ngramHistory.get(ngram3) || 0;

          // Eğer 4-gram 2 kez veya 3-gram 3 kez tekrarlandıysa dur
          if (count4 >= 2 || count3 >= 3) {
            console.log('N-gram repetition detected, stopping');
            if (step >= minTokens) break;
          }
        }

        // Stop tokens kontrolü - geliştirilmiş
        const endOfTextToken = vocab['<|endoftext|>'] || 50256;
        const periodToken = vocab['.'] || vocab['Ġ.'];
        const exclamationToken = vocab['!'] || vocab['Ġ!'];
        const questionToken = vocab['?'] || vocab['Ġ?'];
        const newlineToken = vocab['\n'] || vocab['Ċ'];
        const colonToken = vocab[':'] || vocab['Ġ:'];

        // Cümle sonu kontrolü
        if (selectedTokenId === endOfTextToken) {
          console.log('End of text token bulundu');
          if (step >= minTokens) break;
        }

        // Mantıklı durak noktaları
        const sentenceEndTokens = [
          periodToken,
          exclamationToken,
          questionToken,
        ];

        if (step > minTokens) {
          // Cümle sonlarında dur
          if (sentenceEndTokens.includes(selectedTokenId)) {
            allTokens.push(selectedTokenId);

            // Bir sonraki token'a bak, eğer büyük harf veya newline geliyorsa dur
            const nextStep = Math.random();
            if (nextStep > 0.7 || step > 20) {
              // %70 ihtimalle veya 20 token'dan sonra dur
              console.log('Cümle sonu bulundu');
              break;
            }
          }

          // Newline veya colon'da dur
          if (
            selectedTokenId === newlineToken ||
            (selectedTokenId === colonToken && step > 15)
          ) {
            console.log('Paragraph sonu bulundu');
            break;
          }
        }

        const tokenStr = reverseVocab[selectedTokenId] || '<unk>';

        if (tokenStr.startsWith('Ġ') && tokenStrings.length > 0) {
          let currentText = tokenStrings.join('');
          currentText = currentText.replace(/Ġ/g, ' ');
          currentText = currentText.replace(/Ċ/g, '\n');
          currentText = currentText.trim();
          onUpdate(currentText);
        }

        tokenStrings.push(tokenStr);

        allTokens.push(selectedTokenId);
        pastKeyValues = results;

        // Update recent tokens for repetition penalty
        recentTokens.push(selectedTokenId);
        if (recentTokens.length > repetitionWindow) {
          recentTokens.shift();
        }

        console.log(
          `Step ${step}: Token ${selectedTokenId} (${reverseVocab[selectedTokenId]})`,
        );
      }

      // Son kelimeyi ekle
      if (tokenStrings.length > 0) {
        let currentText = tokenStrings.join('');
        currentText = currentText.replace(/Ġ/g, ' ');
        currentText = currentText.replace(/Ċ/g, '\n');
        currentText = currentText.trim();
        onUpdate(currentText);
      }

      // Son temizleme işlemleri
      let responseText = tokenStrings.join('');
      responseText = responseText.replace(/Ġ/g, ' ');
      responseText = responseText.replace(/Ċ/g, '\n');
      responseText = responseText
        .replace(/Human:/gi, '')
        .replace(/Assistant:/gi, '')
        .replace(/AI:/gi, '')
        .replace(/\n{2,}/g, '\n')
        .replace(/\s+/g, ' ')
        .trim();

      // Çok kısa veya anlamsız yanıtları kontrol et
      const wordCount = responseText
        .split(' ')
        .filter(w => w.length > 0).length;

      if (responseText.length < 10 || wordCount < 3) {
        // Context-aware default yanıtlar
        const contextualResponses = {
          greeting: [
            'Hello! How can I assist you today?',
            'Hi there! What would you like to talk about?',
            "Greetings! I'm here to help.",
          ],
          question: [
            "That's an interesting question. Let me think about it.",
            "I'd be happy to help you with that.",
            'Let me provide you with some information.',
          ],
          statement: [
            "I understand what you're saying.",
            "That's a valid point.",
            'Thank you for sharing that with me.',
          ],
          default: [
            "I'm here to help! What would you like to know?",
            'Feel free to ask me anything.',
            'How may I assist you further?',
          ],
        };

        // Input'a göre uygun yanıt kategorisini seç
        let category = 'default';
        const lowerInput = inputText.toLowerCase();

        if (lowerInput.match(/^(hi|hello|hey|greetings|merhaba|selam)/)) {
          category = 'greeting';
        } else if (
          lowerInput.includes('?') ||
          lowerInput.match(
            /^(what|who|where|when|why|how|ne|kim|nerede|ne zaman|neden|nasıl)/,
          )
        ) {
          category = 'question';
        } else if (lowerInput.length > 20) {
          category = 'statement';
        }

        const responses = contextualResponses[category];
        responseText = responses[Math.floor(Math.random() * responses.length)];
      }

      // Başındaki ve sonundaki noktalama işaretlerini düzelt
      responseText = responseText.replace(/^[.,;:]\s*/, '');
      if (!responseText.match(/[.!?]$/)) {
        responseText += '.';
      }

      onUpdate(responseText);

      console.log('Response text:', responseText);
    } catch (error) {
      console.error('Text generation error:', error);
      onUpdate('Hata: ' + error.message);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !modelLoaded) return;

    const currentInput = inputText;
    setInputText('');

    const userMessage = { text: currentInput, sender: 'user', completed: true };
    setMessages(prev => [...prev, userMessage]);

    const botMessage = { text: '', sender: 'bot', completed: false };
    setMessages(prev => [...prev, botMessage]);

    setIsLoading(true);

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    await generateResponse(currentInput, updatedText => {
      setMessages(prev =>
        prev.map((msg, idx) =>
          idx === prev.length - 1 ? { ...msg, text: updatedText } : msg,
        ),
      );
    });

    setMessages(prev =>
      prev.map((msg, idx) =>
        idx === prev.length - 1 ? { ...msg, completed: true } : msg,
      ),
    );

    setIsLoading(false);
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DistilGPT-2 Chatbot</Text>
        {modelLoaded && (
          <TouchableOpacity
            onPress={handleClearChat}
            style={styles.clearButton}
          >
            <Text style={styles.clearButtonText}>Temizle</Text>
          </TouchableOpacity>
        )}
      </View>

      {!modelLoaded && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Model yükleniyor...</Text>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() =>
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }
      >
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.sender === 'user' ? styles.userBubble : styles.botBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                message.sender === 'user' ? styles.userText : styles.botText,
              ]}
            >
              {message.text ||
                (message.sender === 'bot' && !message.completed
                  ? 'Düşünüyorum...'
                  : message.text)}
            </Text>
            {/* Typing indicator for bot messages */}
            {message.sender === 'bot' && !message.completed && (
              <View style={styles.typingIndicator}>
                <ActivityIndicator size="small" color="#666" />
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Mesajınızı yazın..."
          multiline
          editable={modelLoaded && !isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!modelLoaded || isLoading || !inputText.trim()) &&
              styles.disabledButton,
          ]}
          onPress={handleSend}
          disabled={!modelLoaded || isLoading || !inputText.trim()}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendButtonText}>Gönder</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ff6b6b',
    borderRadius: 12,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messagesContent: {
    paddingVertical: 16,
  },
  messageBubble: {
    padding: 12,
    marginVertical: 4,
    borderRadius: 16,
    maxWidth: '80%',
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  botBubble: {
    backgroundColor: '#e0e0e0',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#333',
  },
  typingIndicator: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f8f8',
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default DistilGPT2Chatbot;
