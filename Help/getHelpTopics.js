import { supabase } from "../Utils/supabase";

/**
 * Fetches help topic records from Supabase and packages them into a key-based dictionary.
 * @returns {Promise<Record<string, { title: string, html: string, width?: number }>>}
 */
export async function getHelpTopics() {
  try {
    const { data, error } = await supabase
      .from('help_topics')
      .select('topic_key, title, body, image, width')
      .order('topic_key', { ascending: true })
      .abortSignal(AbortSignal.timeout(6000)); // Fails cleanly after 5 seconds
      
    if (error) {
      //console.error('❌ Error fetching help topics from DB:', error.message);
      return {};
    }

    if (!data || data.length === 0) {
      //console.warn('⚠️ No help topics found in DB.');
      return {};                      
    }

    const topics = {};

    data.forEach(item => {
      let combinedHtml = item.body || '';
      let imageUrl     = null;

      // Append image markup if an image object exists
      if (item.image?.src) {
        const { data: storageData } = supabase
          .storage
          .from('help-images')
          .getPublicUrl(item.image.src);

        const publicUrl = storageData?.publicUrl;

        if (publicUrl) {
          imageUrl = publicUrl;
          const imageType = item.image.type || 'table';

          combinedHtml += `
            <div class="help-card-image-container">
              <img src="${publicUrl}" alt="${item.title}" class="help-card-image help-card-image-${imageType}" />
            </div>
          `.trim();
        }
      }

      topics[item.topic_key] = {
        title: item.title,
        html:  combinedHtml,
        image: imageUrl,
        width: item.width
      };
    });

    //console.log(`📚 Help topics loaded from DB: ${Object.keys(topics).length}`);
    return topics;

  } catch (err) {
    //console.error('❌ Failed to execute getHelpTopics:', err);
    return {};
  }
}