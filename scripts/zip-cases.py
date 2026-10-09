import pathlib
import sys
import zipfile

source, target = map(pathlib.Path, sys.argv[1:])
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for file in sorted(source.rglob('*')):
        if any(p.startswith('._') or p == '.DS_Store' for p in file.parts):
            continue
        if file.is_symlink():
            raise ValueError('Symlinks are not allowed')
        if file.is_file():
            info = zipfile.ZipInfo('m-type-demo-cases/' + file.relative_to(source).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, file.read_bytes())
