export const unzip = async function (zip_buffer) {
  const zip_array = new Uint8Array(zip_buffer);
  const data_view = new DataView(zip_buffer);
  const output = [];
  let index = 0;
  while (true) {
    const signature = data_view.getUint32(index, true);
    if (signature === 0x04034b50) {
      // local file info
      const file = {};
      const filename_length = data_view.getUint16(index + 26, true);
      const extra_length = data_view.getUint16(index + 28, true);
      const filename_bytes = new Uint8Array(
        zip_array.slice(index + 30, index + 30 + filename_length),
      );
      file.filename = new TextDecoder("utf8").decode(filename_bytes);
      file.starts_at = index + 30 + filename_length + extra_length;
      file.compressed_size = data_view.getUint32(index + 18, true);
      file.compression_method = data_view.getUint16(index + 8, true);
      file.general_purpose_flag = data_view.getUint16(index + 6, true);
      file.stream_bit_is_set = (file.general_purpose_flag >> 3) & (0x1 === 1); // bit 3 has the "streamed" flag
      if (file.stream_bit_is_set) {
        let searching_for_stream_header = true;
        let search_index = file.starts_at;
        while (searching_for_stream_header) {
          const signature = data_view.getUint32(search_index, true);
          if (signature === 0x08074b50) {
            // streaming data info
            file.compressed_size = data_view.getUint32(search_index + 8, true);
            searching_for_stream_header = false;
          } else {
            search_index = search_index + 1;
          }
        }
      }
      const compressed_data_end = file.starts_at + file.compressed_size;
      const jump_to_index = file.stream_bit_is_set
        ? compressed_data_end + 16
        : compressed_data_end;
      const raw_buffer = zip_array.slice(file.starts_at, compressed_data_end);
      if (file.compression_method === 0x00) {
        // "none", uncompressed/inflated
        file.buffer = raw_buffer;
      } else if (file.compression_method === 0x08) {
        // "DEFLATE", compressed/deflated
        file.buffer = await new Response(
          new Blob([raw_buffer])
            .stream()
            .pipeThrough(new DecompressionStream("deflate-raw")),
        ).arrayBuffer();
      } else {
        throw new Error(
          `Unsupported compression method 0x${file.compression_method.toString(16)}`,
        );
      }
      index = jump_to_index;
      const is_directory = /\/$/.test(file.filename);
      if (!is_directory) {
        output.push(file);
      }
    } else if (signature === 0x02014b50) {
      // central directory info (this just gets jumped over)
      const filename_length = data_view.getUint16(index + 28, true);
      const extra_length = data_view.getUint16(index + 30, true);
      const comment_length = data_view.getUint16(index + 32, true);
      index = index + 46 + filename_length + extra_length + comment_length;
    } else if (signature === 0x06054b50) {
      // end of central directory
      break;
    } else {
      throw new Error(
        `Unsupported zip format signature 0x${signature.toString(16)}`,
      );
    }
  }
  return output;
};
