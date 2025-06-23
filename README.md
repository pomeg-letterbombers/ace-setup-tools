# ace-setup-tools

This is a collection of web tools that assist with installing an ACE environment. These tools are built using the Bootstrap CSS framework, and JavaScript.

<dl>
<dt>Donor Search</dt>
<dd>

Finds RNG advances that result in Pokémon that would return results in the <i>Species Word Finder</i>. For Japanese FireRed/LeafGreen.

</dd>
<dt>Species Word Finder</dt>
<dd>

Given a TID and PID, search for easy chat words that when decrypted result in a value within a list of targets (this version searches the list in the <i>FireRed_Species.csv</i> or <i>LeafGreen_Species.csv</i> file, depending on game version). For Japanese FireRed/LeafGreen.

</dd>
<dt>Checksum Adjustment Calculator</dt>
<dd>

Given a checksum difference (that being the base value, and the new value), encryption key, and a replacement value, find the adjustment to a stat needed so that the replacement value (along with the target value) keeps the Pokémon’s checksum valid. For Japanese FireRed/LeafGreen.

</dd>
</dl>

## Credits

*   [デテロニー (detelony)](https://www.youtube.com/@detelony) for the original Japanese FireRed and LeafGreen ACE environment tutorial, and the original implementations of the associated tools.
*   [lincoln](https://github.com/lincoln-lm) for [JS-Finder](https://github.com/lincoln-lm/js-finder) the RNG algorithm implementation where inspiration was taken.

## License

© 2025 Luong Truong (final).

This project is licensed under the terms of the MIT license, which can be found in [LICENSE](LICENSE).
